// Updated function for login to format user response
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        // Exclude sensitive fields
        const { password, ...userResponse } = user.toObject();
        res.json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Updated function for signup to format user response
app.post('/signup', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        // Exclude sensitive fields
        const { password, ...userResponse } = newUser.toObject();
        res.status(201).json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
