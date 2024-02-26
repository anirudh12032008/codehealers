require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3000;
// const OpenAI = require('openai');
// const openai = new OpenAI();
// const openaiApiKey = process.env.OPENAI_API_KEY;
// openai.apiKey = openaiApiKey;



// Express Config
app.set('view engine', 'ejs'); 
app.set('views', __dirname + '/views');
app.use(express.static('public'));  
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


// isLogin
const isLogin = (req, res, next) => {
  if (!req?.session?.user){
    return res.redirect('/login');
  }
  next();
};
app.get("/", (req, res)=>{
  res.render('index.ejs')
})
app.get('/', isLogin, async(req, res) => {
  res.render('buddy', {user: req.session.user})
})
// register
app.get('/register', async(req,res)=>{
    res.render('register.ejs')
})
// login
app.get('/login', async(req,res)=>{
    res.render('login.ejs')
})
// profile
app.get('/profile', isLogin, (req, res) => {
  res.render('profile', { user: req.session.user });
});
// location
app.get('/location', async(req, res) => {
  res.render('location')
})


// POST Routes
// register
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
// login
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
      res.redirect('/profile');
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
});
// logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/login'); 
    });
  });
// buddy
app.post('/buddy', async (req, res) => {
    const { prompt } = req.body;
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
    });
    console.log(completion);
    console.log('response');
    console.log(completion.choices[0]['message']['content']);
    res.send(completion.choices[0]['message']['content'])
});
// location
app.post('/api/post-location', async(req, res) => {
  const {latitude, longitude } = req.body
  console.log(latitude, longitude);
})
// server start
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
