export interface Roast {
  gotcha: string;
  roast: string;
}

export const ROASTS: Roast[] = [
  {
    gotcha: "NOTHING HERE.",
    roast: "Just like your git blame. Empty. Cowardly. Yours.",
  },
  {
    gotcha: "DECOY.",
    roast: "This cabinet has been closed since the last sprint that shipped on time.",
  },
  {
    gotcha: "NICE TRY.",
    roast: "That's the JIRA backlog. Searching it only adds three new tickets.",
  },
  {
    gotcha: "WRONG DRAWER.",
    roast: "npm install found 847 vulnerabilities. None of them were in here either.",
  },
  {
    gotcha: "EMPTY.",
    roast: "Like your commit messages. 'fix stuff.' 'wip.' 'asdfgh.' Shameful.",
  },
  {
    gotcha: "GOTCHA.",
    roast: "You searched a server rack. It has better uptime than your PRs.",
  },
  {
    gotcha: "DECOY.",
    roast: "This meeting room holds 12. It could've been an email. Still isn't.",
  },
  {
    gotcha: "MISS.",
    roast: "Off by one. It was the next desk. Classic off-by-one error. Classic you.",
  },
  {
    gotcha: "NOTHING.",
    roast: "The Stack Overflow answer you need is behind a login wall from 2014.",
  },
  {
    gotcha: "GOTCHA.",
    roast: "AI wrote 80% of your last PR. You still introduced this bug. Impressive.",
  },
  {
    gotcha: "DECOY.",
    roast: "That's the Agile Manifesto on the wall. Nobody here has read it either.",
  },
  {
    gotcha: "WRONG ONE.",
    roast: "You pushed to main. This drawer is also empty. Today is not your day.",
  },
  {
    gotcha: "EMPTY.",
    roast: "Your rubber duck could've told you this was a trap. Did you even ask it?",
  },
  {
    gotcha: "GOTCHA.",
    roast: "This is where the 10x developer myth is stored. Still just a myth.",
  },
  {
    gotcha: "NOTHING HERE.",
    roast: "localhost:3000 would never do this to you. You should've stayed home.",
  },
  {
    gotcha: "DECOY.",
    roast: "Someone opened a JIRA ticket about this box in 2022. Status: IN PROGRESS.",
  },
  {
    gotcha: "MISS.",
    roast: "Merge conflict. You picked the wrong side. Again. As always. Forever.",
  },
  {
    gotcha: "GOTCHA.",
    roast: "The senior dev saw you search that. They said nothing. They are disappointed.",
  },
  {
    gotcha: "NOPE.",
    roast: "You just searched the on-call rotation board. Now you're on-call. Congrats.",
  },
  {
    gotcha: "DECOY.",
    roast: "This is where node_modules lives in spirit. 237MB. Zero items you need.",
  },
  {
    gotcha: "WRONG BOX.",
    roast: "Standup starts in 4 minutes. You have nothing to show. And now this.",
  },
  {
    gotcha: "EMPTY.",
    roast: "Like the test coverage on the module you just shipped. Enjoy the silence.",
  },
  {
    gotcha: "GOTCHA.",
    roast: "ChatGPT hallucinated this item's location. You trusted it. Deeply embarrassing.",
  },
  {
    gotcha: "NOTHING.",
    roast: "This was a dependency three refactors ago. It has been deprecated. Like you.",
  },
  {
    gotcha: "DECOY.",
    roast: "git blame points to you. The drawer is empty. The shame is full.",
  },
  {
    gotcha: "GOTCHA.",
    roast: "The Stack Overflow accepted answer was from 2011 and it was also wrong. Sorry.",
  },
  {
    gotcha: "MISS.",
    roast: "You commented out the right path instead of the wrong one. Chef's kiss.",
  },
  {
    gotcha: "DECOY.",
    roast: "It's a temp/ folder. 312 files. Created in 2021. You will not touch this either.",
  },
  {
    gotcha: "NOTHING HERE.",
    roast: "The sprint ended. The item was never groomed. It's in the next sprint. Somewhere.",
  },
  {
    gotcha: "GOTCHA.",
    roast: "You searched the dark for 30 seconds. Missing semicolon. It always is.",
  },
];

export function getRandomRoast(): Roast {
  return ROASTS[Math.floor(Math.random() * ROASTS.length)];
}
