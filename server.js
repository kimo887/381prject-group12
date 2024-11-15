const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); //Let User is the models of login and register
const Item = require('./models/Item'); // Let Item is the models of borrowing book

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.set('view engine', 'ejs');

app.use(express.static('public')); //Register static file middleware to serve static files from the public folder

// MongoDB connection string
const MONGO_URI = 'mongodb+srv://qm887:hu845600@cluster0.hwdmf.mongodb.net/mydatabase?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => {
    console.log('MongoDB connection error:', err);
  });

// Handle the root path request and redirect to /login.
app.get('/', (req, res) => {
  res.redirect('/login');
});


// routing to login
app.get('/login', (req, res) => {
  res.render('login');
});

// routing to register
app.get('/register', (req, res) => {
  res.render('register');
});

// registe logic
app.post('/register', async (req, res) => {
  // get username password and Referee
  const { username, password, referee } = req.body;
  
  // Use referee to ensure registration is not abused, only for librarian
  // Registrant should enter alin or Alin in this column
  if (referee !== 'Alin' && referee !== 'alin') {
    // if Referee is not alin or Alin，return error and go back to register.ejs
    
    //use center.css to keep the return message in center
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Registration Failed</title>
      </head>
      <body>
        <div class="center-container">
          <p>Invalid Referee. Please enter your interviewer as Referee.</p>
          <a href="/register">
            <button>Back to Register</button>
          </a>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // if Referee is correct，keep going
    const user = new User({ username, password });
    await user.save();
    res.redirect('/login');
  } catch (error) {
    res.status(400).send('Error during registration. Please try again.');
  }
});

// login logic
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await user.comparePassword(password)) {
    const token = jwt.sign({ id: user._id }, 'your_jwt_secret_key', { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/crud');
  } else {
    res.status(401).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Login Failed</title>
      </head>
      <body>
        <div class="center-container">
          <p>Invalid username or password. Please try again.</p>
          <a href="/login">
            <button>Back to Login</button>
          </a>
        </div>
      </body>
      </html>
    `);
  }
});

// use cookies to verify the user's identity and combine this with JWT to ensure that the user is properly authenticated.
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');
  jwt.verify(token, 'your_jwt_secret_key', (err, decoded) => {
    if (err) return res.redirect('/login'); //if err occour, back to login page
    req.userId = decoded.id;
    next();
  });
};

// user logout and goback to login page
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// CRUD page（only the user already login can see）
app.get('/crud', authMiddleware, (req, res) => {
  res.render('crud');
});

// create book borrowing record
app.post('/create', authMiddleware, async (req, res) => {
  const { bookId, bookTitle } = req.body;
  const borrowDate = new Date(); // Get current date
  const returnDate = new Date(borrowDate); 
  returnDate.setDate(borrowDate.getDate() + 7); // current date +7days to set due date for return book

  try {
    const newItem = new Item({
      bookId,
      bookTitle,
      borrowDate,
      returnDate
    });
    await newItem.save();


    //center.css
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Operation Successful</title>
      </head>
      <body>
        <div class="center-container">
          <p>Operation successful!</p>
          <p>The due date is ${returnDate.toDateString()}.</p>
          <a href="/crud">
            <button>Back to Library Management System</button>
          </a>
        </div>
      </body>
      </html>
    `);

    //center.css
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Error</title>
      </head>
      <body>
        <div class="center-container">
          <p>This book has already been borrowed.</p>
          <a href="/crud">
            <button>Back to Library Management System</button>
          </a>
        </div>
      </body>
      </html>
    `);
  }
});

// read borrowing record 
app.get('/read', authMiddleware, async (req, res) => {
  const { bookId } = req.query;
  try {
    const item = await Item.findOne({ bookId });
    if (item) {

      // return the result 
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="/center.css">
          <title>Book Information</title>
        </head>
        <body>
          <div class="center-container">
            <p>Book ID: ${item.bookId}</p>
            <p>Title: ${item.bookTitle}</p>
            <p>Due Date: ${item.returnDate.toDateString()}</p>
            <a href="/crud">
              <button>Back to Library Management System</button>
            </a>
          </div>
        </body>
        </html>
      `);
    } else {
      // return err message and goback button
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="/center.css">
          <title>Record Not Found</title>
        </head>
        <body>
          <div class="center-container">
            <p>This record was not found, please check whether you entered the correct book ID.</p>
            <a href="/crud">
              <button>Back to Library Management System</button>
            </a>
          </div>
        </body>
        </html>
      `);
    }


  } catch (error) {
    // error handle
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Error</title>
      </head>
      <body>
        <div class="center-container">
          <p>Error fetching book information.</p>
          <a href="/crud">
            <button>Back to Library Management System</button>
          </a>
        </div>
      </body>
      </html>
    `);
  }
});


// update the new due date
app.post('/update', authMiddleware, async (req, res) => {
  const { bookId, newReturnDate } = req.body;

  try {
    // find the record in Item model
    const item = await Item.findOne({ bookId });
    
    if (!item) {
      // if does not exist, return err message and go back to management page 
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="/center.css">
          <title>Book Not Found</title>
        </head>
        <body>
          <div class="center-container">
            <p>Book not found. Please check the book ID.</p>
            <a href="/crud">
              <button>Back to Library Management System</button>
            </a>
          </div>
        </body>
        </html>
      `);
    }

    //  newReturnDate transfer to Date object
    const newReturnDateObj = new Date(newReturnDate);

    // make sure the return date is not earlier than borrow date 
    if (newReturnDateObj < item.borrowDate) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="/center.css">
          <title>Invalid Return Date</title>
        </head>
        <body>
          <div class="center-container">
            <p>Error: The return date cannot be earlier than the borrow date (${item.borrowDate.toDateString()}).</p>
            <a href="/crud">
              <button>Back to Library Management System</button>
            </a>
          </div>
        </body>
        </html>
      `);
    }

    // do it if the date is correct 
    item.returnDate = newReturnDateObj;
    await item.save();

    // return new updated information
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Return Date Updated</title>
      </head>
      <body>
        <div class="center-container">
          <p>Successfully updated the return date!</p>
          <p>Book ID: ${item.bookId}</p>
          <p>Title: ${item.bookTitle}</p>
          <p>New Return Date: ${newReturnDateObj.toDateString()}</p>
          <a href="/crud">
            <button>Back to Library Management System</button>
          </a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    // error handling
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Error</title>
      </head>
      <body>
        <div class="center-container">
          <p>Error updating return date. Please try again later.</p>
          <a href="/crud">
            <button>Back to Library Management System</button>
          </a>
        </div>
      </body>
      </html>
    `);
  }
});





// delete function
app.post('/delete', authMiddleware, async (req, res) => {
  const { bookId } = req.body;
  try {
    const item = await Item.findOneAndDelete({ bookId });
    if (item) {
      // return massage to remind librarian the opperation had finished already.
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="/center.css">
          <title>Delete Success</title>
        </head>
        <body>
          <div class="center-container">
            <p>Successfully returned the book. Please place it back on the appropriate book shelf.</p>
            <a href="/crud">
              <button>Back to Library Management System</button>
            </a>
          </div>
        </body>
        </html>
      `);
    } else {
      

      // if the record was not found, return err and goback 
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="/center.css">
          <title>Record Not Found</title>
        </head>
        <body>
          <div class="center-container">
            <p>The record is not found, please confirm that you entered the correct book ID.</p>
            <a href="/crud">
              <button>Back to Library Management System</button>
            </a>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {


    // handle error
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/center.css">
        <title>Error</title>
      </head>
      <body>
        <div class="center-container">
          <p>Error. Please try again later.</p>
          <a href="/crud">
            <button>Back to Library Management System</button>
          </a>
        </div>
      </body>
      </html>
    `);
  }
});



// listen port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});