"use client";

import Image from "next/image";
import styles from "./app.module.css";
import { getFirestore, collection } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { firebaseApp, logPoop, register } from "./db";
import { Attendee, Poop } from "./interfaces";
import { useState, useEffect } from "react";
import { formatTime, getLeaderboard } from "./util";
import ShowWhenReady from "./components/ShowWhenReady";

export default function Home() {
  const [name, setName] = useState("");

  useEffect(() => {
    const cachedName = localStorage.getItem("otgw-name");
    if (cachedName) {
      setName(cachedName);
    }
  }, []);

  const handleSetName = (newName: string) => {
    setName(newName);
    if (newName.trim()) {
      localStorage.setItem("otgw-name", newName);
    } else {
      localStorage.removeItem("otgw-name");
    }
  };
  const [attendeesCollection, attendeesLoading, attendeesError] = useCollection(
    collection(getFirestore(firebaseApp), "attendees"),
    {
      snapshotListenOptions: { includeMetadataChanges: true },
    },
  );
  const [poopsCollection, poopsLoading, poopsError] = useCollection(
    collection(getFirestore(firebaseApp), "poops"),
    {
      snapshotListenOptions: { includeMetadataChanges: true },
    },
  );

  const attendees = attendeesCollection?.docs.map(
    (doc) => doc.data() as Attendee,
  );
  const poops = poopsCollection?.docs
    .map((doc) => doc.data() as Poop)
    .toSorted((a, b) => a.timestamp - b.timestamp);

  const attendeeNamesSet = [
    ...new Set(attendees?.map((attendee) => attendee.name)),
  ];

  const loading = attendeesLoading || poopsLoading;
  const error = attendeesError || poopsError;

  const nameForPooper = name.length > 0 ? name : "anonymous";

  const leaderboard = poops && getLeaderboard(poops);

  const registerCallback = () => {
    if (name.length > 0) {
      register(name);
    }
  };

  const poopCallback = () => {
    logPoop(nameForPooper, name.length === 0);
  };

  return (
    <div className={styles.appContainer}>
      <div className={styles.innerContainer}>
        <div className={styles.titleContainer}>
          Xiaoxue and Ashley
          <br />
          Joint Bday Party
        </div>
        <Image
          src="/invite2.png"
          width="500"
          height="500"
          alt="PUMPKIN KING"
          className={styles.headerGif}
        />

        <div className={styles.details}>
          <h3>Where?</h3>
          4019 29 St, Queens NY
          <h3>When?</h3>
          Starting 8pm on Saturday, Nov 14. You are welcome to sleep over if it
          gets late!!
        </div>

        <div className={styles.description}>
          <h3>Why a joint party?</h3>
          Ashley's birthday is on November 12th and Xiaoxue's birthday is on
          November 15th. Ashley felt a little too shy to throw a party solo and
          Xiaoxue had the generous idea of doing one together. Friendship is so
          magical!!!
          <br></br>
          <br></br>
          Several amazing college friends are visiting and booked a house in
          LIC. So we are having the party there!
          <br></br>
          <br></br>
          Thanks to Marcos for making the original version of this evite website
          and putting the code online, Anas for giving us the idea to steal it,
          and Kelly for the epic poster design!!
        </div>
        <div className={styles.bring}>
          <h3>Should I bring a gift?</h3>
          Don't buy us any gifts!!! But we would accept a nice little card or
          donations (like $5 or so?) to cover the house cost for our visiting
          friends.
        </div>
        <div className={styles.attendees}>
          <h3>Who&apos;s going?</h3>
          <ShowWhenReady
            loading={loading}
            error={Boolean(error)}
            errorMessage={"couldn't load attendees!"}
          >
            <ul>
              {attendeeNamesSet.map((attendeeName) => (
                <li key={attendeeName}>{attendeeName} is going!</li>
              ))}
            </ul>
          </ShowWhenReady>
        </div>
        <div className={styles.attend}>
          <h3>Can I come?</h3>
          Yes!
          <div className={styles.signUp}>
            <input
              value={name}
              onChange={(e) => handleSetName(e.target.value)}
              className={styles.nameInput}
              placeholder="name"
            />
            <button onClick={registerCallback} disabled={name.length === 0}>
              I&apos;m going!
            </button>
          </div>
        </div>
        <div className={styles.poopContainer}>
          <h3>Poop</h3>
          <div>Poop as {nameForPooper}:</div>
          <button onClick={poopCallback} className={styles.poopImageButton}>
            <Image src="/poop.png" width="50" height="50" alt="poop" />
          </button>
          <div className={styles.poopLog}>
            <ShowWhenReady
              loading={loading}
              error={Boolean(error)}
              errorMessage="couldn't fetch poops!"
            >
              <ul>
                {poops?.toReversed().map((poop) => (
                  <li key={`${poop.pooper}:${poop.timestamp}`}>
                    {poop.pooper} pooped at {formatTime(poop.timestamp)}
                  </li>
                ))}
              </ul>
            </ShowWhenReady>
          </div>
          <div className={styles.topPoopers}>
            <h3>Top Poopers</h3>
            <div className={styles.poopLeaderboard}>
              <ShowWhenReady
                loading={loading}
                error={Boolean(error)}
                errorMessage="couldn't fetch leaderboard!"
              >
                <ol>
                  {leaderboard?.slice(0, 10).map(([name, poops]) => (
                    <li key={name}>
                      {name} ({poops} {poops === 1 ? "poop" : "poops"})
                    </li>
                  ))}
                </ol>
              </ShowWhenReady>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
