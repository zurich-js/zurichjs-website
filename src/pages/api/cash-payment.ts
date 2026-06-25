import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { emailSchema, optionalText, requiredText, slugSchema } from "@/lib/validation/input";

// In a real app, you would use a database to store this information
const paymentReservations = new Map();

const cashPaymentSchema = z
  .object({
    name: requiredText(160),
    email: emailSchema,
    streetAndNumber: requiredText(180),
    postcode: requiredText(40),
    city: requiredText(120),
    country: requiredText(80),
    ticketTitle: requiredText(240),
    price: z.coerce.number().min(0).max(100000),
    eventId: slugSchema.optional(),
    workshopId: slugSchema.optional(),
    ticketType: optionalText(80),
    paymentMethod: z.enum(["cash", "bank"]).optional().default("cash"),
  })
  .refine((value) => value.eventId || value.workshopId, {
    message: "eventId or workshopId is required",
  });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);

    const parsed = cashPaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payment reservation request" });
    }

    const {
      name,
      email,
      streetAndNumber,
      postcode,
      city,
      country,
      ticketTitle,
      price,
      eventId,
      workshopId,
      ticketType,
      paymentMethod,
    } = parsed.data;

    // Create reservation data
    const reservation = {
      name,
      email,
      streetAndNumber,
      postcode,
      city,
      country,
      ticketTitle,
      price,
      userId,
      eventId,
      workshopId,
      ticketType,
      paymentMethod,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // In a real implementation, you would save this to a database

    // Store it in memory for demo purposes
    const reservationKey = `${email}-${eventId || workshopId}`;
    paymentReservations.set(reservationKey, reservation);

    // Return success with user details instead of session ID
    return res.status(200).json({
      success: true,
      reservation: {
        name,
        email,
        streetAndNumber,
        postcode,
        city,
        country,
        ticketTitle,
        price,
        paymentMethod,
        eventId,
        workshopId,
        ticketType,
      },
      message: `${paymentMethod === "cash" ? "Cash" : "Bank transfer"} payment reservation created successfully`,
    });
  } catch (error) {
    console.error("Payment reservation error:", error);
    return res.status(500).json({
      error: "An error occurred while processing your request",
    });
  }
}

export default handler;
