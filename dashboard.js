firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("Authenticated user:", {
      uid: user.uid,
      email: user.email,
    });
    firebase.firestore().collection("quotes").get()
      .then((snapshot) => {
        console.log("Quotes loaded:", snapshot.docs.map(doc => doc.data()));
      })      .catch((error) => {        console.error("Error loading quotes:", error);      });  } else {    console.error("No authenticated user.");  }});