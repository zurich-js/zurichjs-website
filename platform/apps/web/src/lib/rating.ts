import { submitForm } from '@zurichjs/forms/client';
import type { RatingInput } from '@zurichjs/design/islands/RatingSheet';

/** Wires the design system's RatingSheet to the forms API. */
export const submitRating = (r: RatingInput) => submitForm('rating', r);
