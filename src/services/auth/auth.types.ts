export interface OrganizerDto {
  organizerId: number;
  fullName: string;
  email: string;
}

export interface AuthResponseDto {
  token: string;
  organizer: OrganizerDto;
  message: string;
}

export interface GoogleLoginPayload {
  userId: string;
  email: string;
  fullName?: string;
}

export interface EmailLoginPayload {
  email: string;
}

export interface EmailSignupPayload {
  fullName: string;
  email: string;
}