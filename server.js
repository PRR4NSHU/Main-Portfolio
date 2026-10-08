require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// --- Configuration ---
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY ); 
const IV_LENGTH = 16; 

// --- Email Configuration (From .env) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // .env se email lega
        pass: process.env.EMAIL_PASS  // .env se password lega
    }
});

// --- Helpers (Encrypt/Decrypt) ---
function encrypt(text) {
    if(!text) return text;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if(!text) return text;
    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) { return "[Corrupted Data]"; }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Schemas
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    resetOTP: String,
    resetOTPExpires: Date
});
const Admin = mongoose.model('Admin', adminSchema);

const contactSchema = new mongoose.Schema({
    name: String, email: String, message: String,
    date: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// Admin Init (Auto Create)
async function initializeAdmin() {
    try {
        const count = await Admin.countDocuments();
        if (count === 0) {
            const hash = await bcrypt.hash("password123", 10);
            await new Admin({ username: "admin", email: "admin@example.com", password: hash }).save();
            console.log("🎉 Default Admin Created: admin | password123");
        }
    } catch (e) { console.log(e); }
}

mongoose.connect(MONGO_URI).then(async () => {
    console.log("✅ MongoDB Connected");
    await initializeAdmin();
}).catch(err => console.log("❌ DB Error:", err));


// --- ROUTES ---

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/work', (req, res) => res.sendFile(path.join(__dirname, 'work.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// API: Send Message
app.post('/send-message', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const newContact = new Contact({ name: encrypt(name), email: encrypt(email), message: encrypt(message) });
        await newContact.save();
        res.status(201).json({ message: "Message sent!" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

// API: Login
app.post('/api/admin-login', async (req, res) => {
    const { loginId, password } = req.body;
    try {
        const admin = await Admin.findOne({ $or: [{ username: loginId }, { email: loginId }] });
        if (!admin || !await bcrypt.compare(password, admin.password)) return res.status(401).json({ error: "Invalid Credentials" });

        const contacts = await Contact.find().sort({ date: -1 });
        const data = contacts.map(c => ({
            name: decrypt(c.name), email: decrypt(c.email), message: decrypt(c.message), date: c.date
        }));
        res.json({ success: true, data, user: { username: admin.username, email: admin.email } });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// API: Update Profile
app.post('/api/admin-update', async (req, res) => {
    const { currentEmail, newUsername, newEmail, newPassword } = req.body;
    try {
        const admin = await Admin.findOne({ email: currentEmail });
        if (!admin) return res.status(404).json({ error: "Admin not found" });

        if (newUsername) admin.username = newUsername;
        if (newEmail) admin.email = newEmail;
        if (newPassword) admin.password = await bcrypt.hash(newPassword, 10);

        await admin.save();
        res.json({ success: true, message: "Profile Updated!" });
    } catch (e) { res.status(500).json({ error: "Update Failed" }); }
});

// API: Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(404).json({ error: "Email not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        admin.resetOTP = otp;
        admin.resetOTPExpires = Date.now() + 600000;
        await admin.save();

        console.log(`📧 EMAIL TO: ${email} | 🔑 OTP: ${otp}`);
        res.json({ success: true, message: "OTP sent (Check Terminal)" });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// API: Reset Password
app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const admin = await Admin.findOne({ 
            email, resetOTP: otp, resetOTPExpires: { $gt: Date.now() } 
        });
        if (!admin) return res.status(400).json({ error: "Invalid OTP" });

        admin.password = await bcrypt.hash(newPassword, 10);
        admin.resetOTP = undefined;
        admin.resetOTPExpires = undefined;
        await admin.save();

        res.json({ success: true, message: "Password reset success!" });
    } catch (e) { res.status(500).json({ error: "Reset Failed" }); }
});


// --- NEW ROUTE: REPLY TO USER (Using .env) ---
app.post('/api/reply-message', async (req, res) => {
    const { toEmail, subject, replyMessage } = req.body;

    const mailOptions = {
        from: process.env.EMAIL_USER, // .env se email use karega
        to: toEmail,
        subject: subject,
        text: replyMessage
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Reply Sent Successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send email. Check credentials." });
    }
});



app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));