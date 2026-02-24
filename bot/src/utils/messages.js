const { getSetting } = require('../db/members');

const DEFAULT_WELCOME = `\u{1F44B} Welcome to Superteam MY!

To get started, please introduce yourself in the Intro Channel using this format \u{1F447}

This helps everyone get context and makes collaboration easier.

\u{1F4DD} Intro format:
\u2022 Who are you & what do you do?
\u2022 Where are you based?
\u2022 One fun fact about you
\u2022 How are you looking to contribute to Superteam MY?

No pressure to be perfect \u2014 just be you!`;

const DEFAULT_EXAMPLE = `\u2728 Example intro

Hey everyone! I'm Marianne \u{1F44B}
Together with Han, we are Co-Leads of Superteam Malaysia!

\u{1F4CD} Based in Kuala Lumpur and Network School
\u{1F9D1}\u200D\u{1F393} Fun fact: My first Solana project was building an AI Telegram trading bot, and that's how I found myself in Superteam MY!
\u{1F91D} Looking to contribute by:
\u2022 Connecting builders with the right mentors, partners, and opportunities
\u2022 Helping teams refine their story, demos, and go-to-market
\u2022 Supporting members who want to go from "building quietly" \u2192 "shipping publicly"

Excited to build alongside all of you \u2014 feel free to reach out anytime \u{1F64C}`;

async function getWelcomeMessage(introChannelId) {
  const custom = await getSetting('welcome_message');
  const welcome = custom || DEFAULT_WELCOME;
  const example = (await getSetting('intro_example')) || DEFAULT_EXAMPLE;

  return `${welcome}\n\n\u{1F449} Post your intro here: https://t.me/c/${String(introChannelId).replace('-100', '')}\n\n${example}`;
}

function getReminderMessage(introChannelId) {
  return `\u23F3 Hey! You haven't introduced yourself yet.\nPlease post your intro in the Intro Channel first, then you'll be able to chat here.\n\n\u{1F449} https://t.me/c/${String(introChannelId).replace('-100', '')}`;
}

function getCongratsMessage(firstName) {
  return `\u{1F389} Thanks for introducing yourself, ${firstName}! You now have full access to the group. Welcome aboard!`;
}

function getIntroFeedbackMessage() {
  return `Thanks for your intro! Could you expand it a bit? Try to include:\n\u2022 Who you are & what you do\n\u2022 Where you're based\n\u2022 A fun fact\n\u2022 How you'd like to contribute\n\nNo pressure \u2014 just helps everyone get to know you better! \u{1F60A}`;
}

module.exports = {
  getWelcomeMessage,
  getReminderMessage,
  getCongratsMessage,
  getIntroFeedbackMessage,
};
