import { auth } from './firebase';

declare global {
  interface Window {
    gapi: any;
  }
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface PairProgrammingSlot {
  id: string;
  mentorId: string;
  mentorName: string;
  startTime: Date;
  endTime: Date;
  topic: string;
  isAvailable: boolean;
  calendarEventId?: string;
}

class GoogleCalendarService {
  private isAuthenticated = false;
  private isGapiLoaded = false;

  constructor() {
    this.initializeGapi();
  }

  private async initializeGapi() {
    try {
      // Check if Google client ID is configured
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your_google_client_id_here') {
        console.warn('Google API client ID not configured, skipping GAPI initialization');
        return;
      }

      // Load the Google API client
      await new Promise<void>((resolve, reject) => {
        if (window.gapi) {
          window.gapi.load('client:auth2', () => {
            window.gapi.client.init({
              clientId: clientId,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
              scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
              ux_mode: 'redirect'
            }).then(() => {
              this.isGapiLoaded = true;
              resolve();
            }).catch((error: any) => {
              console.warn('GAPI initialization failed, falling back to Firebase Auth tokens:', error);
              // Don't reject, allow fallback to Firebase tokens
              resolve();
            });
          });
        } else {
          console.warn('GAPI not loaded, using Firebase Auth tokens only');
          resolve();
        }
      });
    } catch (error) {
      console.warn('Failed to initialize GAPI, using Firebase Auth tokens:', error);
    }
  }

  async authenticateWithGoogle(): Promise<boolean> {
    try {
      // Check if Google client ID is configured
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your_google_client_id_here') {
        console.warn('Google API client ID not configured, skipping Google Calendar authentication');
        this.isAuthenticated = false;
        return false;
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated with Firebase');
      }

      // Try to get Firebase access token and use it for Calendar API
      try {
        const token = await user.getIdToken();
        if (token) {
          // Initialize GAPI client with the token
          if (!this.isGapiLoaded) {
            await this.initializeGapi();
          }

          // Set the access token for GAPI
          window.gapi.client.setToken({ access_token: token });
          this.isAuthenticated = true;
          return true;
        }
      } catch (tokenError) {
        console.warn('Failed to get Firebase token for Calendar API:', tokenError);
      }

      // Fallback: Try GAPI auth with redirect mode
      try {
        const authInstance = window.gapi?.auth2?.getAuthInstance();
        if (authInstance && authInstance.isSignedIn?.get()) {
          this.isAuthenticated = true;
          return true;
        }

        // If GAPI is available but not signed in, redirect to Google OAuth
        if (authInstance) {
          // Use redirect mode instead of popup
          authInstance.signIn({
            prompt: 'consent',
            scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
            ux_mode: 'redirect'
          });
          // This will redirect the page, so we won't reach here
          return false;
        }
      } catch (gapiError) {
        console.warn('GAPI authentication failed:', gapiError);
      }

      // If we get here, authentication failed
      this.isAuthenticated = false;
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  async getCalendarEvents(timeMin?: Date, timeMax?: Date): Promise<CalendarEvent[]> {
    // Check if Google client ID is configured
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id_here') {
      console.warn('Google API client ID not configured, returning empty calendar events');
      return [];
    }

    if (!this.isAuthenticated || !this.isGapiLoaded) {
      console.warn('Google Calendar not authenticated, returning empty events');
      return [];
    }

    try {
      const request = {
        'calendarId': 'primary',
        'timeMin': timeMin?.toISOString() || new Date().toISOString(),
        'timeMax': timeMax?.toISOString(),
        'singleEvents': true,
        'orderBy': 'startTime',
      };

      const response = await window.gapi.client.calendar.events.list(request);

      return response.result.items.map((event: any) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        status: event.status,
      }));
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw error;
    }
  }

  async createCalendarEvent(event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
    location?: string;
  }): Promise<CalendarEvent> {
    // Check if Google client ID is configured
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id_here') {
      throw new Error('Google API client ID not configured');
    }

    if (!this.isAuthenticated || !this.isGapiLoaded) {
      throw new Error('Google Calendar not authenticated');
    }

    try {
      const calendarEvent = {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: event.attendees?.map(email => ({ email })),
        location: event.location,
      };

      const request = {
        'calendarId': 'primary',
        'resource': calendarEvent,
      };

      const response = await window.gapi.client.calendar.events.insert(request);

      return {
        id: response.result.id,
        summary: response.result.summary,
        description: response.result.description,
        start: response.result.start,
        end: response.result.end,
        attendees: response.result.attendees,
        location: response.result.location,
        status: response.result.status,
      };
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  async updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (!this.isAuthenticated || !this.isGapiLoaded) {
      throw new Error('Google Calendar not authenticated');
    }

    try {
      const request = {
        'calendarId': 'primary',
        'eventId': eventId,
        'resource': updates,
      };

      const response = await window.gapi.client.calendar.events.patch(request);

      return {
        id: response.result.id,
        summary: response.result.summary,
        description: response.result.description,
        start: response.result.start,
        end: response.result.end,
        attendees: response.result.attendees,
        location: response.result.location,
        status: response.result.status,
      };
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    if (!this.isAuthenticated || !this.isGapiLoaded) {
      throw new Error('Google Calendar not authenticated');
    }

    try {
      const request = {
        'calendarId': 'primary',
        'eventId': eventId,
      };

      await window.gapi.client.calendar.events.delete(request);
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  // Filter events to find pair programming slots
  filterPairProgrammingEvents(events: CalendarEvent[]): PairProgrammingSlot[] {
    const pairProgrammingKeywords = [
      'pair programming',
      'pair-programming',
      'mentoring',
      'mentoring session',
      'code review',
      'code-review',
      'debugging session',
      'programming help',
      'coding session',
      '1:1 mentoring',
      'one-on-one',
      'tutoring',
      'teaching session'
    ];

    return events
      .filter(event => {
        if (!event.summary) return false;

        const summary = event.summary.toLowerCase();
        const description = (event.description || '').toLowerCase();
        const fullText = `${summary} ${description}`;

        // Check if any pair programming keywords are present
        return pairProgrammingKeywords.some(keyword =>
          fullText.includes(keyword)
        );
      })
      .map(event => {
        const mentorInfo = this.extractMentorInfo(event);
        return {
          id: event.id,
          mentorId: mentorInfo.id,
          mentorName: mentorInfo.name,
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          topic: this.extractTopicFromEvent(event),
          isAvailable: this.isSlotAvailable(event),
          calendarEventId: event.id,
        };
      });
  }

  private extractMentorInfo(event: CalendarEvent): { id: string; name: string } {
    // Try to identify the mentor from attendees
    // Assume the first attendee or the organizer is the mentor
    if (event.attendees && event.attendees.length > 0) {
      // Look for accepted attendees (likely the mentor)
      const acceptedAttendee = event.attendees.find(attendee =>
        attendee.responseStatus === 'accepted'
      );
      if (acceptedAttendee) {
        return {
          id: acceptedAttendee.email || '',
          name: acceptedAttendee.displayName || acceptedAttendee.email || 'Unknown Mentor'
        };
      }

      // Fallback to first attendee
      const firstAttendee = event.attendees[0];
      return {
        id: firstAttendee.email || '',
        name: firstAttendee.displayName || firstAttendee.email || 'Unknown Mentor'
      };
    }

    // If no attendees, try to extract from description or summary
    const text = `${event.summary} ${event.description || ''}`.toLowerCase();
    const mentorPatterns = [
      /mentor:\s*([^,\n]+)/i,
      /with\s+([^,\n]+)\s*(?:\(|$)/i,
      /tutor:\s*([^,\n]+)/i,
    ];

    for (const pattern of mentorPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          id: '', // Can't extract email from text
          name: match[1].trim()
        };
      }
    }

    return {
      id: '',
      name: 'Unknown Mentor'
    };
  }

  private isSlotAvailable(event: CalendarEvent): boolean {
    // Check if the event is confirmed and has no conflicts
    if (event.status !== 'confirmed') return false;

    // Check for declined attendees
    if (event.attendees?.some(attendee => attendee.responseStatus === 'declined')) {
      return false;
    }

    // Check if the event is in the past
    const now = new Date();
    const eventStart = new Date(event.start.dateTime);
    if (eventStart < now) return false;

    return true;
  }

  private extractTopicFromEvent(event: CalendarEvent): string {
    // Extract topic from event summary or description
    const text = `${event.summary} ${event.description || ''}`.toLowerCase();

    // Look for common topic patterns
    const topicPatterns = [
      /topic:\s*([^,\n]+)/i,
      /subject:\s*([^,\n]+)/i,
      /focus:\s*([^,\n]+)/i,
      /about:\s*([^,\n]+)/i,
      /regarding:\s*([^,\n]+)/i,
    ];

    for (const pattern of topicPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback to summary if no topic found
    return event.summary || 'General Pair Programming';
  }

  async getAvailableSlots(mentorId: string, startDate: Date, endDate: Date): Promise<PairProgrammingSlot[]> {
    try {
      const events = await this.getCalendarEvents(startDate, endDate);
      const pairProgrammingEvents = this.filterPairProgrammingEvents(events);

      // Filter events for the specific mentor
      return pairProgrammingEvents.filter(slot =>
        slot.mentorId === mentorId && slot.isAvailable
      );
    } catch (error) {
      console.error('Failed to get available slots:', error);
      return [];
    }
  }

  async checkAvailability(mentorId: string, startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const events = await this.getCalendarEvents(startTime, endTime);
      const conflictingEvents = events.filter(event =>
        event.status === 'confirmed' &&
        new Date(event.start.dateTime) < endTime &&
        new Date(event.end.dateTime) > startTime
      );

      return conflictingEvents.length === 0;
    } catch (error) {
      console.error('Failed to check availability:', error);
      return false;
    }
  }

  isCalendarAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  async refreshAuth(): Promise<void> {
    await this.authenticateWithGoogle();
  }
}

export const googleCalendarService = new GoogleCalendarService();