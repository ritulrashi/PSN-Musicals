# PSN-Musicals
Developed an event logging system for PSN Musical, a Bollywood karaoke group, using Node.js, Express.js, OAuth, HTML, CSS, JavaScript, and file system operations. This project enables efficient event management, allowing the group to log and track performances, enhancing their ability to connect with audiences and streamline operations.

# Features
* Google OAuth Authentication: Users can authenticate using their Google accounts.
* Event Management: Users can effortlessly add, edit, and delete events.
* Event Showcase: Events are categorized into Past Events and Upcoming Events for easy browsing.
* Event Details & Gallery: Each event features member details and a gallery of up to 50 images on the event details page.
  
# Setup Instructions
1. Clone the repository and save it in a PSN-Musicals folder
2. Create a new 'package.json' file in your project directory
```
npm init
```
3. Make sure to add this to your 'package.json' file
```
"type": "module"
```
5. Install dependencies:
```
npm i express passport passport-google-oauth20 express-session body-parser path url fs multer
```
6. Set up Google OAuth Credentials:
* Create a Google Developer Console project.
* Obtain OAuth Client ID and Client Secret.
* Update clientID and clientSecret in index.js with your credentials.
7. Run the application:
```
node index.js
```
The application will be accessible at 'http://localhost:3000'.
