require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = 3000;
app.set('view engine', 'ejs'); 
app.set('views', __dirname + '/views');  
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Create .env file and in that write URL=xyz instead of xyz use the db url like the below one
// 'mongodb+srv://ayeshanaaz396:Ayesha%40396@cluster0.lne4swa.mongodb.net/healer?retryWrites=true&w=majority'
mongoose.connect(process.env.URL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));    

app.use(bodyParser.json());
app.use(session({ secret: 'ani', resave: false, saveUninitialized: true }));

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    fullname: String,
    mobile: Number,
    age: Number,
    height: Number,
    weight: Number,
    sp: String,
    gender: String,
    bg: String
});
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    next();
  });
  const User = mongoose.model('User', userSchema);


app.get('/register', async(req,res)=>{
    res.render('register.ejs')
})



app.get('/login', async(req,res)=>{
    res.render('login.ejs')
})


app.post('/register', async (req, res) => {
    console.log(req.body);
    try {
      const user = new User(req.body);
      await user.save();
      req.session.user = user;
      res.redirect('/profile');
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Error creating user' });
    }
  });


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      req.session.user = user;

      res.status(200).json({ message: 'Login successful', username: user.username });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
});
  
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/login'); 
    });
  });
app.get('/profile', (req, res) => {
    res.render('profile', { user: req.session.user });
  });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
