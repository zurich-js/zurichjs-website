/**
 * Member-facing emails. Each template takes typed props and returns blocks;
 * layout.ts renders them. Copy rules (AGENTS.md): plain, specific, no em dashes.
 * Later phases add their templates here (docs/v2/MEMBERSHIP.md, "Email").
 */
import { render, type EmailContent, type RenderedEmail } from './layout.ts';

export interface LoginLinkProps {
  /** The Supabase verification link (expires; see `validMinutes`). */
  url: string;
  /** How long the link works, from the Supabase project's email OTP expiry. */
  validMinutes: number;
  /** True for someone signing in for the first time (Supabase `signup`). */
  firstTime: boolean;
}

function loginLink(p: LoginLinkProps): EmailContent {
  const minutes = `${p.validMinutes} minute${p.validMinutes === 1 ? '' : 's'}`;
  return {
    subject: 'Your ZurichJS sign-in link',
    preheader: `Sign in to your ZurichJS member account. The link works for ${minutes}.`,
    heading: p.firstTime ? 'Welcome to your ZurichJS account' : 'Sign in to ZurichJS',
    blocks: [
      {
        kind: 'p',
        text: p.firstTime
          ? 'You asked to sign in to the ZurichJS member area. Use the button to confirm your email and sign in.'
          : 'Use the button to sign in to the ZurichJS member area.',
      },
      { kind: 'button', label: 'Sign in', url: p.url },
      { kind: 'small', text: `The link works once, for ${minutes}, on the device where you open it.` },
      { kind: 'url', text: 'If the button does not work, copy this link into your browser:', url: p.url },
      { kind: 'small', text: 'Did not ask for this? Ignore this email. Nobody can sign in without the link.' },
    ],
  };
}

const TEMPLATES = {
  'login-link': loginLink,
} satisfies Record<string, (p: never) => EmailContent>;

export type TemplateName = keyof typeof TEMPLATES;
export type TemplateProps<N extends TemplateName> = Parameters<(typeof TEMPLATES)[N]>[0];

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];

export function renderEmail<N extends TemplateName>(name: N, props: TemplateProps<N>): RenderedEmail {
  return render((TEMPLATES[name] as (p: TemplateProps<N>) => EmailContent)(props));
}
