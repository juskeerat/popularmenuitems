# Popular Menu Finder 🍽️

A web application that analyzes Google Maps restaurant reviews to find the most popular and recommended dishes. Simply paste a Google Maps restaurant URL and get personalized dish recommendations based on customer reviews!

## Features

- 🔍 **Smart Review Analysis**: Scrapes and analyzes Google Maps restaurant reviews
- 🍕 **Dish Detection**: Identifies food items mentioned in reviews using a comprehensive keyword database
- 📊 **Sentiment Analysis**: Evaluates customer sentiment for each dish
- 🏆 **Scoring System**: Ranks dishes based on mentions, ratings, and positive feedback
- 📱 **Responsive Design**: Beautiful, modern UI that works on all devices
- ⚡ **Real-time Results**: Get recommendations instantly after analysis

## How It Works

1. **Web Scraping**: Uses Puppeteer to extract reviews from Google Maps restaurant pages
2. **Natural Language Processing**: Analyzes review text to identify food-related keywords
3. **Sentiment Analysis**: Evaluates the emotional tone of reviews mentioning each dish
4. **Scoring Algorithm**: Combines multiple factors to rank dishes:
   - Average rating (40% weight)
   - Positive sentiment ratio (40% weight)
   - Number of mentions (20% weight)

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Google Places API key (optional but recommended)

### Setup

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd PopularMenuApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Places API (Recommended)**
   
   For the best experience and most reliable data, set up a Google Places API key:
   
   a. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   b. Create a new project or select an existing one
   c. Enable the "Places API"
   d. Create credentials (API key)
   e. Copy the API key
   
   f. Create a `.env` file in the project root:
   ```bash
   cp env.example .env
   ```
   
   g. Add your API key to the `.env` file:
   ```
   GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
   ```
   
   **Free Tier:** Google Places API offers a $200 monthly credit until February 28, 2025!

4. **Start the application**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

## Usage

1. **Find a Restaurant**: Go to Google Maps and search for a restaurant
2. **Copy the URL**: Copy the restaurant's Google Maps URL from your browser (supports both traditional and shortened formats)
3. **Paste and Analyze**: Paste the URL into the app and click "Analyze Reviews"
4. **Get Recommendations**: View the most recommended dishes with detailed statistics

## Example

Input: `https://maps.app.goo.gl/VaTHrz99aCoqiTCP7` or `https://www.google.com/maps/place/Some+Restaurant`

Output:
- **Top Recommendation**: Pizza (Score: 8.5)
  - Average Rating: 4.2/5
  - 15 mentions
  - 87% positive reviews
  - Sample reviews with sentiment analysis

## Technical Details

### Backend Technologies
- **Express.js**: Web server framework
- **Google Places API**: Primary data source for restaurant information and reviews
- **Puppeteer**: Headless browser for web scraping (fallback method)
- **Natural**: Natural language processing library
- **Cheerio**: HTML parsing and manipulation
- **Axios**: HTTP client for API requests

### Frontend Technologies
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern styling with gradients and animations
- **Font Awesome**: Icons and visual elements

### Key Components

#### Data Retrieval (`server.js`)
- **Primary**: Uses Google Places API for reliable restaurant data
- **Fallback**: Web scraping with Puppeteer when API is unavailable
- Extracts review text, ratings, and restaurant details
- Handles both regular and shortened Google Maps URLs

#### Dish Analysis (`server.js`)
- Comprehensive food keyword database
- Sentiment analysis using AFINN lexicon
- Scoring algorithm for dish ranking

#### User Interface (`public/index.html`)
- Responsive design for all screen sizes
- Real-time loading states
- Error handling and user feedback

## Food Keywords Database

The app includes an extensive database of food-related keywords covering:
- International cuisines (Italian, Asian, Mexican, Indian, etc.)
- Common dishes (pizza, sushi, tacos, curry, etc.)
- Desserts and beverages
- Ingredients and cooking methods

## Limitations

- **Google Maps Structure**: The app relies on Google Maps' current HTML structure and may need updates if Google changes their layout
- **Rate Limiting**: Google may limit requests if too many are made in a short time
- **Review Availability**: Only analyzes reviews that are publicly visible on Google Maps
- **Language**: Currently optimized for English-language reviews

## Troubleshooting

### Common Issues

1. **"No reviews found"**
   - Ensure the URL is from Google Maps
   - Check if the restaurant has public reviews
   - Try refreshing the page

2. **"Failed to analyze restaurant"**
   - Check your internet connection
   - The restaurant page might be temporarily unavailable
   - Try again in a few minutes

3. **Slow loading**
   - The app needs to scrape multiple reviews
   - Larger restaurants with more reviews take longer
   - Be patient during the analysis process

### Performance Tips

- The app limits analysis to 50 reviews for performance
- Only dishes mentioned at least twice are included
- Results are cached during the session

## Contributing

Feel free to contribute to this project by:
- Adding more food keywords to the database
- Improving the sentiment analysis algorithm
- Enhancing the UI/UX
- Adding support for other review platforms

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is for educational and personal use. Please respect Google's terms of service and use responsibly. The app does not store or redistribute any review data.

---

**Happy dining! 🍴** 