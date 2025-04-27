import { createWhiteLabeledLink, getWhiteLabeledLink, validateWhiteLabeledLink } from './links.js';

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("Authenticated user:", {
      uid: user.uid,
      email: user.email,
    });

    // Ensure the user document exists in Firestore
    const userRef = firebase.firestore().collection("users").doc(user.uid);
    userRef.get()
      .then((doc) => {
        if (!doc.exists) {
          // Create a new user document
          userRef.set({
            email: user.email,
            name: user.displayName || "Anonymous",
            image: user.photoURL || null,
            emailVerified: user.emailVerified,
            role: "consumer", // Default role; adjust as needed
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          }).then(() => {
            console.log("User document created for UID:", user.uid);
          }).catch((error) => {
            console.error("Error creating user document:", error);
          });
        } else {
          console.log("User document already exists for UID:", user.uid);
          const userData = doc.data();

          // Check user role and perform role-specific actions
          if (userData.role === "contractor") {
            console.log("Contractor logged in.");
            // Example: Create a white-labeled link
            createWhiteLabeledLink(user.uid).then((linkId) => {
              console.log("Generated link ID:", linkId);
            });
          } else if (userData.role === "consumer") {
            console.log("Consumer logged in.");
            // Fetch quotes for the consumer
            fetchQuotesForConsumer(user.uid);
          }
        }
      })
      .catch((error) => {
        console.error("Error checking user document:", error);
      });
  } else {
    console.log("No authenticated user. Public access enabled.");
    // Fetch public quotes or handle white-labeled link access
    fetchPublicQuotes();
  }
});

// Fetch quotes for a consumer from all contractors
function fetchQuotesForConsumer(consumerId) {
  firebase.firestore().collection("quotes")
    .where("consumerId", "==", consumerId)
    .get()
    .then((snapshot) => {
      const quotes = snapshot.docs.map(doc => doc.data());
      console.log("Quotes for consumer:", quotes);
    })
    .catch((error) => {
      console.error("Error fetching quotes for consumer:", error);
    });
}

// Fetch public quotes
function fetchPublicQuotes() {
  firebase.firestore().collection("quotes")
    .where("public", "==", true)
    .get()
    .then((snapshot) => {
      const quotes = snapshot.docs.map(doc => doc.data());
      console.log("Public quotes:", quotes);
    })
    .catch((error) => {
      console.error("Error fetching public quotes:", error);
    });
}

// Create a white-labeled link for contractors/admins
function createWhiteLabeledLink(contractorId) {
  const linkRef = firebase.firestore().collection("links").doc();
  linkRef.set({
    creatorId: contractorId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    linkId: linkRef.id,
  }).then(() => {
    console.log("White-labeled link created:", linkRef.id);
  }).catch((error) => {
    console.error("Error creating white-labeled link:", error);
  });
}