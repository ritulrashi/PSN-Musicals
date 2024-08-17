import express from 'express';
import bodyParser from 'body-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import multer from 'multer';
import path from 'path';

const app = express();
const port = 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));


// Configure body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(join(__dirname, 'public')));

app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Configure session
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: '1064682603987-ouut5sm923sv490s9vrekde962itl2tp.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(token, tokenSecret, profile, done) {
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Helper function to categorize events
function categorizeEvents(events) {
    const now = new Date();
    let pastEvents = [];
    let upcomingEvents = [];

    events.forEach(event => {
        const eventDate = new Date(event.date);
        if (eventDate < now) {
            pastEvents.push(event);
        } else {
            upcomingEvents.push(event);
        }
    });

    return { pastEvents, upcomingEvents };
}

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/', 
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Route to handle past events
app.get('/past-events', (req, res) => {
    const datesFile = `${__dirname}/dataFiles/dates.txt`;
    fs.readFile(datesFile, 'utf8', (err, data) => {
        if (err) throw err;
        const events = data.split('\n').filter(line => line.trim() !== '').map(line => {
            const [date, file] = line.split('|');
            return { date: date.trim(), file: file.trim() };
        });

        // Read each event file to get the event name
        const eventsWithNames = events.map(event => {
            const eventFilePath = `${__dirname}/dataFiles/${event.file}`;
            const eventContent = fs.readFileSync(eventFilePath, 'utf8');
            const eventName = eventContent.split('\n')[1].split(':')[1].trim(); 
            return { date: event.date, name: eventName, file: event.file };
        });

        const authenticated = req.isAuthenticated();
        const { pastEvents } = categorizeEvents(eventsWithNames);
        res.render('past-events', { events: pastEvents, pageTitle: 'Past Events', authenticated });
    });
});


// Route to handle upcoming events
app.get('/upcoming-events', (req, res) => {
    const datesFile = `${__dirname}/dataFiles/dates.txt`;
    fs.readFile(datesFile, 'utf8', (err, data) => {
        if (err) throw err;
        const events = data.split('\n').filter(line => line.trim() !== '').map(line => {
            const [date, file] = line.split('|');
            return { date: date.trim(), file: file.trim() };
        });

        const eventsWithNames = events.map(event => {
            const eventFilePath = `${__dirname}/dataFiles/${event.file}`;
            const eventContent = fs.readFileSync(eventFilePath, 'utf8');
            const eventName = eventContent.split('\n')[1].split(':')[1].trim(); 
            return { date: event.date, name: eventName, file: event.file };
        });

        const authenticated = req.isAuthenticated();
        const { upcomingEvents } = categorizeEvents(eventsWithNames);
        res.render('upcoming-events', { events: upcomingEvents, pageTitle: 'Upcoming Events', authenticated });
    });
});

// Route to handle event details
app.get('/:type-events/:file', (req, res) => {
    const eventFile = join(__dirname, 'dataFiles', req.params.file);
    fs.readFile(eventFile, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file: ${err}`);
            res.status(404).send('Event not found');
            return;
        }
        const authenticated = req.isAuthenticated();
        const details = data.split('\n').map(line => line.trim()); 
        res.render('event-details', { details, authenticated });
    });
});


// Route to render the members page
app.get('/members', (req, res) => {
    const isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false;
    res.render('members', { authenticated: isAuthenticated });
  });

// Google OAuth routes
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to dashboard.
    res.redirect('/dashboard');
  });

app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Dashboard route
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard');
});

// Route to render add-event page
app.get('/add-event', ensureAuthenticated, (req, res) => {
    res.render('add-event');
});

// Route to handle adding a new event
app.post('/add-event', ensureAuthenticated, upload.array('photos', 50), (req, res) => {
    const { eventName, eventDate, eventHost, numAttendees, attendeesSongs, eventDetails } = req.body;

    if (!eventName || !eventDate || !eventHost || !numAttendees || !attendeesSongs || !eventDetails) {
        return res.redirect('/add-event');  
    }

    const datesFile = `${__dirname}/dataFiles/dates.txt`;
    fs.readFile(datesFile, 'utf8', (err, data) => {
        if (err) throw err;

        const dates = data.split('\n').map(line => line.split('|')[0]);
        if (dates.includes(eventDate)) {
            return res.status(400).json({ error: 'Event date already exists' });
        }

        const eventFileName = `event_${eventDate.replace(/-/g, '_')}.txt`;
        const eventLine = `${eventDate}|${eventFileName}\n`;

        fs.appendFile(datesFile, eventLine, (err) => {
            if (err) throw err;
            console.log('Added date to dates.txt');
        });

        const eventFile = `${__dirname}/dataFiles/${eventFileName}`;
        let eventContent = `
Name: ${eventName}
Date: ${eventDate}
Host: ${eventHost}
Number of Attendees: ${numAttendees}
Attendees and their Songs:
${attendeesSongs}
Details:
${eventDetails}
Photos:
        `;

        req.files.forEach(file => {
            const tempPath = path.join(__dirname, file.path);
            const targetPath = path.join('uploads', file.originalname);
            fs.rename(tempPath, targetPath, err => {
                if (err) throw err;
                console.log(`Moved ${file.originalname} to uploads`);
            });

            // Add the photo path to the event content
            eventContent += `uploads/${file.originalname}\n`;
        });

        fs.writeFile(eventFile, eventContent, (err) => {
            if (err) throw err;
            console.log('Created new event file');
        });

        res.redirect('/dashboard');
    });
});



// Route to render edit-event page with event selection
app.get('/edit-event', ensureAuthenticated, (req, res) => {
    // Read events from the dates file
    const datesFile = `${__dirname}/dataFiles/dates.txt`;
    fs.readFile(datesFile, 'utf8', (err, data) => {
        if (err) throw err;
        const events = data.split('\n').filter(line => line.trim() !== '').map(line => {
            const [date, file] = line.split('|');
            return { date: date.trim(), file: file.trim() };
        });
        res.render('edit-event', { events });
    });
});

// Route to handle loading event details for editing
app.post('/edit-event', ensureAuthenticated, (req, res) => {
    const { eventFile } = req.body;

    if (!eventFile) {
        return res.redirect('/edit-event');
    }

    const eventFilePath = `${__dirname}/dataFiles/${eventFile}`;
    fs.readFile(eventFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file: ${err}`);
            res.status(404).send('Event not found');
            return;
        }

        const lines = data.split('\n');
        const eventDetails = {};
        lines.forEach(line => {
            const [key, ...value] = line.split(':');
            if (key && value.length) {
                eventDetails[key.trim()] = value.join(':').trim();
            }
        });

        res.render('edit-event-form', {
            event: eventDetails,
            originalFile: eventFile
        });
    });
});

// Route to handle updating an existing event
app.post('/update-event', ensureAuthenticated, (req, res) => {
    const { eventName, eventDate, eventHost, numAttendees, attendeesSongs, eventDetails, originalFile } = req.body;

    if (!eventDate || !originalFile) {
        return res.redirect('/edit-event');
    }

    const originalDate = originalFile.split('_')[1].replace(/\.txt$/, '').split('_').join('-');
    const eventFileName = `event_${eventDate.replace(/-/g, '_')}.txt`;
    const eventFilePath = `${__dirname}/dataFiles/${eventFileName}`;

    const updatedContent = `
Name: ${eventName}
Date: ${eventDate}
Host: ${eventHost}
Number of Attendees: ${numAttendees}
Attendees and their Songs:
${attendeesSongs}
Details:
${eventDetails}
    `;

    fs.writeFile(eventFilePath, updatedContent, (err) => {
        if (err) throw err;
        console.log('Updated event file');
    });

    const datesFile = `${__dirname}/dataFiles/dates.txt`;
    const updatedLines = fs.readFileSync(datesFile, 'utf8')
        .split('\n')
        .map(line => {
            const [date, file] = line.split('|');
            if (date.trim() === originalDate) {
                return `${eventDate}|${eventFileName}`;
            } else {
                return line;
            }
        })
        .filter(line => line.trim() !== '')
        .join('\n');

    fs.writeFile(datesFile, updatedLines, (err) => {
        if (err) throw err;
        console.log('Updated dates.txt');
    });

    res.redirect('/edit-event');
});


// Route to handle file uploads
app.post('/upload', upload.single('eventPhoto'), (req, res) => {
    res.send('File uploaded successfully.');
});

// Route to render contact page
app.get('/contact', (req, res) => {
    res.render('contact');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
