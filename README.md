# Vivahit Pidit Sangh (VPS) Website

A modern, responsive static website for VPS supporting men experiencing domestic and marital abuse.

Pages:
- Home (`index.html`)
- Stories (`stories.html`) – anonymous submission stored locally in the browser
- Contact (`contact.html`) – hotline, email, and session request modal
- About (`about.html`) – mission and approach
- Team (`team.html`) – 5-6 member profiles

## Run locally

Open any file directly in a browser, or serve the folder:

```bash
# macOS
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Customize
- Hotline: search for `+1 (800) 123-4567` and update.
- Email: search for `help@menssupport.org` and update.
- Team profiles: edit `team.html` with your members.
- Colors/fonts: edit `assets/css/styles.css` and Google Fonts link in `<head>`.

Images are referenced from Unsplash and load at runtime.

## Firebase Setup

This application uses Google Cloud Firestore to store anonymous stories. To set up Firestore:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Enable Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left sidebar
2. Click "Create database"
3. Start in **test mode** (for development) or **production mode** (for security rules)
4. Choose a location for your database

### 3. Get Your Firebase Config

1. Go to **Project Settings** (gear icon next to Project Overview)
2. Scroll down to "Your apps" section
3. Click on the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 4. Update Configuration

Update the Firebase configuration in `assets/js/firebase-config.js`:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Replace all the `YOUR_*` placeholders with your actual Firebase configuration values.

### 5. Configure Firestore Security Rules

In the Firestore Console, go to the **Rules** tab and set up **SECURE** security rules. Copy the rules from `firestore.rules` file in this project:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Posts collection - anonymous stories
    match /posts/{postId} {
      // Allow anyone to read posts
      allow read: if true;
      
      // Only allow creating new posts (no updates or deletes)
      allow create: if request.resource.data.story is string
                    && request.resource.data.story.size() > 0
                    && request.resource.data.story.size() <= 4000
                    && request.resource.data.feeling is string
                    && request.resource.data.feeling.size() <= 100
                    && request.resource.data.clientTz is string
                    && request.resource.data.clientTz.size() <= 100
                    && request.resource.data.clientLang is string
                    && request.resource.data.clientLang.size() <= 20
                    && request.resource.data.createdAt is timestamp
                    && request.resource.data.createdAt <= request.time
                    && (request.resource.data.get('screen', '') is string)
                    && request.resource.data.get('screen', '').size() <= 100
                    && (request.resource.data.get('platform', '') is string)
                    && request.resource.data.get('platform', '').size() <= 200;
      
      // No updates or deletes allowed for anonymous posts
      allow update, delete: if false;
    }
    
    // Deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Security Features:**
- ✅ Only `posts` collection is accessible
- ✅ Field type and size validation
- ✅ No updates or deletes allowed
- ✅ All other collections are blocked
- ✅ Timestamp validation to prevent backdated posts

### 6. Test the Setup

1. Open `stories.html` in a browser
2. Try submitting an anonymous story
3. Check your Firestore Console to see the data appear in the `posts` collection

## Notes

- Anonymous stories are stored in Firestore and also fallback to `localStorage` if Firestore is unavailable
- The application collects anonymous metadata (timezone, language, screen size, platform) for analytics
- No personal information (names, emails, phone numbers) is stored

