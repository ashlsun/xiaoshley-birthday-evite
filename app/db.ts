// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  updateDoc,
} from "firebase/firestore";
import {
  Attendee,
  Eviction,
  Poop,
  PollVote,
  SuggestedAction,
  SuggestionVote,
} from "./interfaces";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyDgwdeDK7r9OwJKgy1XtxDJFw9-rO2b9-I",
  authDomain: "xiaoshley-evite.firebaseapp.com",
  projectId: "xiaoshley-evite",
  storageBucket: "xiaoshley-evite.firebasestorage.app",
  messagingSenderId: "900398916807",
  appId: "1:900398916807:web:1161b775ac030de8800ae2",
  measurementId: "G-5DXCK7NTZH",
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

export const register = (name: string) => {
  addDoc(collection(getFirestore(firebaseApp), "attendees"), {
    name: name,
    timestamp: new Date().valueOf(),
  } as Attendee);
};

export const cancelRsvp = (id: string) => {
  deleteDoc(doc(getFirestore(firebaseApp), "attendees", id));
};

export const logEviction = (name: string) => {
  addDoc(collection(getFirestore(firebaseApp), "evictions"), {
    name: name,
    timestamp: new Date().valueOf(),
  } as Eviction);
};

export const castVote = (vote: PollVote, existingVoteId?: string) => {
  const pollVotes = collection(getFirestore(firebaseApp), "pollVotes");
  if (existingVoteId) {
    updateDoc(doc(pollVotes, existingVoteId), {
      choice: vote.choice,
      timestamp: vote.timestamp,
    });
    return;
  }
  addDoc(pollVotes, vote);
};

export const suggestAction = (name: string, text: string) => {
  addDoc(collection(getFirestore(firebaseApp), "suggestions"), {
    name: name,
    text: text,
    timestamp: new Date().valueOf(),
  } as SuggestedAction);
};

export const upvoteSuggestion = (suggestionId: string, voter: string) => {
  addDoc(collection(getFirestore(firebaseApp), "suggestionVotes"), {
    suggestionId: suggestionId,
    voter: voter,
    timestamp: new Date().valueOf(),
  } as SuggestionVote);
};

export const removeSuggestionVote = (id: string) => {
  deleteDoc(doc(getFirestore(firebaseApp), "suggestionVotes", id));
};

export const logPoop = (name: string, ignoreInLeaderboard?: boolean) => {
  addDoc(collection(getFirestore(firebaseApp), "poops"), {
    pooper: name,
    timestamp: new Date().valueOf(),
    ignoreInLeaderboard: ignoreInLeaderboard,
  } as Poop);
};
