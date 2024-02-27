require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path')
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3000;
const OpenAI = require('openai');
const openai = new OpenAI();
const openaiApiKey = process.env.OPENAI_API_KEY;
openai.apiKey = openaiApiKey;
// gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro"});
const axios = require('axios');


// Express Config
app.set('view engine', 'ejs'); 
app.set('views', __dirname + '/views');  
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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
app.get('/', isLogin, async(req, res) => {
  res.render('buddy', {user: req.session.user, log: 1})
})
// register
app.get('/register', async(req,res)=>{
    res.render('register.ejs', {log: 0})
})
// login
app.get('/login', async(req,res)=>{
    res.render('login.ejs', {log: 0})
})
// profile
app.get('/profile', isLogin, (req, res) => {
  res.render('profile', { user: req.session.user , log: 1});
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
    const { prompt, lat, long } = req.body;
    console.log(lat,long,'lat long');
    const geoApiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${long}&format=json`;
    const geoResponse = await axios.get(geoApiUrl);
    const city = geoResponse.data.address.city;
    console.log(`City: ${city}`);

    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const result = await model.generateContent( `Hi 
    tell me 5 hospitals in ${city} with there full address and coordinates
    the response should be in this format
    name
    full Address
    distance of its latitude and longitude from this point lat: ${lat}, long: ${long} in KM
    and so on for all 5
    note that dont include other things like ratings be specific with the details also to dont add anything else just the hospital details no general text `);
    const response = await result.response;
    const text = response.text();
    console.log(text);
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
    });
    res.send({op: completion.choices[0]['message']['content'],
    ge: text})
});

// server start
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
