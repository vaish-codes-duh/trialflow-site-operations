// Default adapter for the original managed Sites deployment.
// The Netlify build replaces this module in its own publish directory only.
export const AUTH = {
  signInPath: '/signin-with-chatgpt?return_to=%2F',
  accountPath: '/signout-with-chatgpt?return_to=%2F',
  accountLabel: 'Sign out',
  switchPath: '/signout-with-chatgpt?return_to=%2F',
  switchLabel: 'Sign out and switch accounts',
  signInLabel: 'Sign in to shared workspace',
};
