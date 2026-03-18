import type { APIContext } from 'astro';
import { GET as handler } from '@/lib/og/partnerships';

export const prerender = false;

export const GET = handler;
