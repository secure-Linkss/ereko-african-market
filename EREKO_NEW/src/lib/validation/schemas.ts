import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(10, "Password must be at least 10 characters long").optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(10, "Password must be at least 10 characters long"),
  phone: z.string().optional(),
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const addressSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  line1: z.string().min(5, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  postcode: z.string().min(5, "Valid postcode is required"),
  countryCode: z.string().min(2, "Country is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

export type AddressFormData = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  shippingAddress: addressSchema,
  billingAddressSameAsShipping: z.boolean(),
  billingAddress: addressSchema.optional(),
  deliveryMethod: z.string().min(1, "Please select a delivery method"),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters long"),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const cargoInquirySchema = z.object({
  senderName: z.string().min(2, "Sender name is required"),
  senderEmail: z.string().email("Please enter a valid email address"),
  senderPhone: z.string().min(10, "Valid phone number is required"),
  recipientName: z.string().min(2, "Recipient name is required"),
  recipientPhone: z.string().min(10, "Valid phone number is required"),
  recipientAddress: z.string().min(5, "Recipient address is required"),
  recipientCity: z.string().min(2, "Recipient city is required"),
  recipientCountry: z.string().min(2, "Recipient country is required"),
  weightEstKg: z.number().min(1, "Estimated weight is required"),
  volumeEstCbm: z.number().optional(),
  itemDescription: z.string().min(5, "Item description is required"),
  urgency: z.enum(["standard", "express", "super-express"]),
});

export type CargoInquiryFormData = z.infer<typeof cargoInquirySchema>;

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().min(2, "Title is required"),
  body: z.string().min(10, "Review body must be at least 10 characters long"),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
