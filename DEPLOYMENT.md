# Firestore Security Rules Deployment Guide

## Quick Setup

### 1. Copy Security Rules to Firebase Console

1. Open `firestore.rules` file in this project
2. Copy the entire contents
3. Go to [Firebase Console](https://console.firebase.google.com/)
4. Select your project (vpps-226db)
5. Go to **Firestore Database** → **Rules** tab
6. Paste the rules
7. Click **Publish**

### 2. Verify the Rules

After publishing, your rules should look like this:

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

### 3. Test the Security

1. Open `http://localhost:8080/stories.html` in your browser
2. Try to submit a story - should work ✅
3. Open browser console (F12)
4. Try to access another collection - should fail ✅

### 4. What's Protected?

#### ✅ Allowed
- Reading all posts from the `posts` collection
- Creating new posts with validated fields

#### ❌ Blocked
- Creating posts with invalid data
- Updating existing posts
- Deleting posts
- Accessing any other collections
- Creating posts with extra fields
- Creating posts with backdated timestamps

### 5. Client-Side Validation

The application also has client-side validation in `assets/js/main.js`:
- Story: 1-4000 characters
- Feeling: max 100 characters
- All metadata fields are truncated to match rule limits
- User-friendly error messages

### 6. Monitoring

To monitor security rule violations:
1. Go to Firebase Console → Firestore Database
2. Click on **Usage** tab
3. Review security rules denials
4. Check **Logs** for any suspicious activity

## Common Issues

### Error: "Missing or insufficient permissions"

**Cause:** Security rules are blocking the operation  
**Solution:** 
1. Verify rules are published correctly
2. Check that data matches validation requirements
3. Ensure you're only accessing the `posts` collection

### Error: "Field size validation failed"

**Cause:** Data exceeds field size limits  
**Solution:** Check client-side validation is working

### Rules not updating

**Cause:** Browser cache or deployment delay  
**Solution:** 
1. Clear browser cache
2. Wait 30 seconds after publishing
3. Check Firebase Console status

## Additional Security Recommendations

1. **Enable App Check** (recommended for production)
   - Go to Firebase Console → App Check
   - Register your domain
   - Enable App Check enforcement

2. **Set up Monitoring**
   - Enable Firebase Alerts
   - Set up email notifications for security rule denials

3. **Regular Audits**
   - Review Firestore usage monthly
   - Check for unusual patterns
   - Monitor write volumes

4. **Rate Limiting** (optional)
   - Consider adding Cloud Functions for rate limiting
   - Use Firebase Extensions for spam prevention

## Support

If you encounter issues:
1. Check browser console for errors
2. Review Firestore logs in Firebase Console
3. Verify rules syntax is correct
4. Test with Firebase Console simulator

