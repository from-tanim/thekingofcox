# King of Cox Convention Hall Website

## How to Update Bookings Manually

1. Navigate to `data/bookings.json` in your GitHub repository
2. Add a new line following this format:
3. {
  "date": "YYYY-MM-DD",
  "shift": "day",  // Use "day" for Day Shift (8AM-8PM) or "night" for Night Shift (8PM-8AM)
  "bookedBy": "Customer/Organization Name",
  "eventType": "Type of Event"
}
