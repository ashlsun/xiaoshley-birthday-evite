"use client";

import Image from "next/image";
import styles from "../app.module.css";
import { getFirestore, collection } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import {
  cancelRsvp,
  castVote,
  firebaseApp,
  logEviction,
  logPoop,
  register,
  removeSuggestionVote,
  suggestAction,
  upvoteSuggestion,
} from "../db";
import {
  Attendee,
  Eviction,
  Poop,
  PollChoice,
  PollVote,
  SuggestedAction,
  SuggestionVote,
} from "../interfaces";
import { useState, useEffect } from "react";
import {
  describePoopBurst,
  describePoopRepeat,
  getHistory,
  getLeaderboard,
  getPollResults,
  getUpvoteCounts,
  readWithLegacyMigration,
} from "../util";
import ShowWhenReady from "./ShowWhenReady";

const NAME_KEY = "xiaoshley-birthday-evite-name";
const VOTER_ID_KEY = "xiaoshley-birthday-evite-voter-id";
const LEGACY_NAME_KEY = "otgw-name";
const LEGACY_VOTER_ID_KEY = "otgw-voter-id";

const DEFIANCE_MESSAGES = [
  "You are currently a member of the house. Do you wish to cancel your RSVP?",
  "You wish to be inducted AGAIN?? Your greed sickens me...",
  "Impudent fool! This is a warning. If you wish to stay a member of the house, DO NOT press the button again.",
];

export default function HomePage() {
  const [name, setName] = useState("");
  const [defiance, setDefiance] = useState(0);
  const [suggestion, setSuggestion] = useState("");
  const [voterId, setVoterId] = useState("");

  useEffect(() => {
    const cachedName = readWithLegacyMigration(NAME_KEY, LEGACY_NAME_KEY);
    if (cachedName) {
      setName(cachedName);
    }

    let id = readWithLegacyMigration(VOTER_ID_KEY, LEGACY_VOTER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VOTER_ID_KEY, id);
    }
    setVoterId(id);
  }, []);

  const handleSetName = (newName: string) => {
    setName(newName);
    setDefiance(0);
    if (newName.trim()) {
      localStorage.setItem(NAME_KEY, newName);
    } else {
      localStorage.removeItem(NAME_KEY);
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
  const [evictionsCollection, evictionsLoading, evictionsError] = useCollection(
    collection(getFirestore(firebaseApp), "evictions"),
    {
      snapshotListenOptions: { includeMetadataChanges: true },
    },
  );
  const [votesCollection, votesLoading, votesError] = useCollection(
    collection(getFirestore(firebaseApp), "pollVotes"),
    {
      snapshotListenOptions: { includeMetadataChanges: true },
    },
  );
  const [suggestionsCollection, suggestionsLoading, suggestionsError] =
    useCollection(collection(getFirestore(firebaseApp), "suggestions"), {
      snapshotListenOptions: { includeMetadataChanges: true },
    });
  const [
    suggestionVotesCollection,
    suggestionVotesLoading,
    suggestionVotesError,
  ] = useCollection(collection(getFirestore(firebaseApp), "suggestionVotes"), {
    snapshotListenOptions: { includeMetadataChanges: true },
  });

  const attendees = attendeesCollection?.docs.map((doc) => ({
    ...(doc.data() as Attendee),
    id: doc.id,
  }));
  const poops = poopsCollection?.docs.map((doc) => doc.data() as Poop);
  const evictions = evictionsCollection?.docs.map(
    (doc) => doc.data() as Eviction,
  );
  const votes = votesCollection?.docs.map((doc) => ({
    ...(doc.data() as PollVote),
    id: doc.id,
  }));
  const suggestedActions = suggestionsCollection?.docs
    .map((doc) => ({ ...(doc.data() as SuggestedAction), id: doc.id }))
    .toSorted((a, b) => a.timestamp - b.timestamp);
  const suggestionVotes = suggestionVotesCollection?.docs.map((doc) => ({
    ...(doc.data() as SuggestionVote),
    id: doc.id,
  }));

  const attendeeNamesSet = [
    ...new Set(attendees?.map((attendee) => attendee.name)),
  ];

  const loading =
    attendeesLoading ||
    poopsLoading ||
    evictionsLoading ||
    votesLoading ||
    suggestionsLoading ||
    suggestionVotesLoading;
  const error =
    attendeesError ||
    poopsError ||
    evictionsError ||
    votesError ||
    suggestionsError ||
    suggestionVotesError;

  const nameForPooper = name.length > 0 ? name : "anonymous";

  const leaderboard = poops && getLeaderboard(poops);
  const history =
    poops && attendees && evictions && getHistory(poops, attendees, evictions);

  const normalizedName = name.trim().toLowerCase();
  const myAttendances =
    attendees?.filter(
      (attendee) => attendee.name.trim().toLowerCase() === normalizedName,
    ) ?? [];
  const isInducted = normalizedName.length > 0 && myAttendances.length > 0;

  const voteKey =
    normalizedName.length > 0 ? `name:${normalizedName}` : `browser:${voterId}`;
  const myVote = votes?.find((vote) => vote.voter === voteKey);
  const pollResults = votes && getPollResults(votes);

  const upvoteCounts = suggestionVotes && getUpvoteCounts(suggestionVotes);
  const hasUpvoted = (suggestionId: string) =>
    Boolean(
      suggestionVotes?.some(
        (vote) => vote.suggestionId === suggestionId && vote.voter === voteKey,
      ),
    );

  const cancelRsvpCallback = () => {
    myAttendances.forEach((attendee) => cancelRsvp(attendee.id));
    setDefiance(0);
  };

  const registerCallback = () => {
    if (name.length === 0) {
      return;
    }
    if (!isInducted) {
      register(name);
      setDefiance(0);
      return;
    }

    const nextPress = defiance + 1;
    if (nextPress < DEFIANCE_MESSAGES.length) {
      setDefiance(nextPress);
      return;
    }

    myAttendances.forEach((attendee) => cancelRsvp(attendee.id));
    logEviction(name.trim());
    setDefiance(0);
  };

  const poopCallback = () => {
    logPoop(nameForPooper, name.length === 0);
  };

  const voteCallback = (choice: PollChoice) => {
    castVote(
      {
        voter: voteKey,
        voterName: name.trim() || "anonymous",
        choice: choice,
        timestamp: new Date().valueOf(),
      },
      myVote?.id,
    );
  };

  const suggestCallback = () => {
    const text = suggestion.trim();
    if (text.length === 0) {
      return;
    }
    suggestAction(name.trim() || "anonymous", text);
    setSuggestion("");
  };

  const upvoteCallback = (suggestionId: string) => {
    const existing = suggestionVotes?.find(
      (vote) => vote.suggestionId === suggestionId && vote.voter === voteKey,
    );
    if (existing) {
      removeSuggestionVote(existing.id);
    } else {
      upvoteSuggestion(suggestionId, voteKey);
    }
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
          src="/invite4.png"
          width="500"
          height="500"
          alt="Poster for birthday party at the intersection of Xiaoxue and Ashley"
          className={styles.headerGif}
        />

        <div className={styles.details}>
          <h3>Where?</h3>
          4019 29 St, Queens NY
          <h3>When?</h3>
          Saturday, Nov 14, starting at 8pm. You are welcome to sleep over if it
          gets late!
        </div>

        <div className={styles.description}>
          <h3>What?</h3>
          Ashley&apos;s birthday is on November 12th and Xiaoxue&apos;s birthday
          is on November 15th. Ashley felt a little shy to throw a party solo
          and Xiaoxue had the generous idea of doing one together. Friendship is
          so magical!!!
          <br></br>
          <br></br>
          Several amazing college friends are visiting and booked a house in
          LIC. So we are having the party there!
          <br></br>
          <br></br>
          SHOUTOUT Marcos from whom we stole the website code,
          Anas/Connor/Qashka for giving us the idea to steal it, and Kelly for
          the epic poster design!!
        </div>
        <div className={styles.bring}>
          <h3>Should I bring a gift?</h3>
          Don&apos;t buy us any gifts!!! But we would welcome donations to help
          cover the house cost for our visiting friends (We&apos;ll put up a qr
          code at the house. Or you can Zelle 9082008977 or Venmo
          Xiaoxue-Resek). Cards also very appreciated!
        </div>
        <div className={styles.attendees}>
          <h3>Who&apos;s in the house of friendship?</h3>
          <ShowWhenReady
            loading={loading}
            error={Boolean(error)}
            errorMessage={"couldn't load attendees!"}
          >
            <ul>
              {attendeeNamesSet.map((attendeeName) => (
                <li key={attendeeName}>
                  <b>{attendeeName}</b> is in the house of friendship!
                </li>
              ))}
            </ul>
          </ShowWhenReady>
        </div>
        <div className={styles.attend}>
          <h3>Can I come?</h3>
          Yes! RSVP here!
          <div className={styles.signUp}>
            <input
              value={name}
              onChange={(e) => handleSetName(e.target.value)}
              className={styles.nameInput}
              placeholder="name"
            />
            <button onClick={registerCallback} disabled={name.length === 0}>
              Induct me into the house of friendship!
            </button>
          </div>
          {isInducted && (
            <div className={styles.alreadyInducted}>
              {DEFIANCE_MESSAGES[defiance] ?? DEFIANCE_MESSAGES[0]}
              <button onClick={cancelRsvpCallback}>Cancel my RSVP</button>
            </div>
          )}
        </div>
        <div className={styles.poopContainer}>
          <h3>Poop</h3>
          <div>Poop as {nameForPooper}:</div>
          <button onClick={poopCallback} className={styles.poopImageButton}>
            <Image src="/poop.png" width="50" height="50" alt="smiley face" />
          </button>
          <div className={styles.poopLog}>
            <b>HISTORY OF EVENTS:</b>
            <ShowWhenReady
              loading={loading}
              error={Boolean(error)}
              errorMessage="couldn't fetch poops!"
            >
              <ul>
                {history?.map((event) => {
                  if (event.kind === "poop") {
                    const description = event.repeat
                      ? describePoopRepeat(event.count)
                      : describePoopBurst(event.count);
                    return (
                      <li key={`poop:${event.pooper}:${event.timestamp}`}>
                        {event.count > 10 ? "🍀" : "☘️"} <b>{event.pooper}</b>{" "}
                        {description}.
                      </li>
                    );
                  }
                  if (event.kind === "eviction") {
                    return (
                      <li key={`eviction:${event.name}:${event.timestamp}`}>
                        👹 <b>{event.name}</b> HAS BEEN REMOVED FROM THE HOUSE
                        OF FRIENDSHIP.
                      </li>
                    );
                  }
                  return (
                    <li key={`induction:${event.name}:${event.timestamp}`}>
                      🌟 <b>{event.name}</b> HAS BEEN INDUCTED INTO THE HOUSE OF
                      FRIENDSHIP.
                    </li>
                  );
                })}
              </ul>
            </ShowWhenReady>
          </div>
          <div className={styles.poll}>
            <h3>Do we want to do something other than poop?</h3>
            <ShowWhenReady
              loading={loading}
              error={Boolean(error)}
              errorMessage="couldn't fetch the poll!"
            >
              <div className={styles.pollButtons}>
                <button onClick={() => voteCallback("yes")}>
                  Yes, let&apos;s add other options
                </button>
                <button onClick={() => voteCallback("no")}>
                  No, we want to poop!
                </button>
              </div>
              <div className={styles.pollResults}>
                Yes: {pollResults?.yes ?? 0} | No: {pollResults?.no ?? 0}
                {myVote && <> (you voted {myVote.choice})</>}
              </div>
              <div className={styles.suggestions}>
                <div className={styles.signUp}>
                  <input
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    className={styles.nameInput}
                    placeholder="suggest another action"
                  />
                  <button
                    onClick={suggestCallback}
                    disabled={suggestion.trim().length === 0}
                  >
                    Suggest
                  </button>
                </div>
                <ul>
                  {suggestedActions?.map((action) => (
                    <li key={action.id}>
                      <button
                        className={`${styles.upvoteButton} ${
                          hasUpvoted(action.id) ? styles.upvoted : ""
                        }`}
                        onClick={() => upvoteCallback(action.id)}
                      >
                        ▲ {upvoteCounts?.get(action.id) ?? 0}
                      </button>
                      {action.text} (suggested by {action.name})
                    </li>
                  ))}
                </ul>
              </div>
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
