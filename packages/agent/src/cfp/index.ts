/**
 * The ZurichJS CFP bot (docs/v2/CFP-BOT.md): people propose a talk by chatting with a second Slack
 * app in the public #cfp channel. Imported as `@zurichjs/agent/cfp`.
 *
 * This folder must never import the organiser bot (../tools.ts, ../programme.ts, ../run.ts,
 * ../store.ts, ../publish.ts, ../prompt.ts, ../slack.ts) or the membership agent: the public
 * channel gets exactly four tools for the speaker's own draft. test/cfp-boundary.test.ts and the
 * oxlint rule in .oxlintrc.json enforce it.
 */
export * from './bot.ts';
export * from './fields.ts';
export * from './limits.ts';
export * from './model.ts';
export * from './prompt.ts';
export * from './run.ts';
export * from './slack.ts';
export * from './store.ts';
export * from './text.ts';
export * from './tools.ts';
export { signInternal, verifyInternal, verifySlackRequest } from '../signatures.ts';
