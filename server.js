const express = require('express');
// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const natural = require('natural');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const nlp = require('compromise');

// puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Enhanced food keywords for fallback (when menu extraction fails)
const FOOD_KEYWORDS = [
  'pizza', 'burger', 'pasta', 'sushi', 'steak', 'chicken', 'fish', 'salad',
  'sandwich', 'taco', 'burrito', 'curry', 'rice', 'noodles', 'soup', 'dessert',
  'cake', 'ice cream', 'coffee', 'tea', 'drink', 'cocktail', 'wine', 'beer',
  'appetizer', 'entree', 'main course', 'side dish', 'dip', 'sauce', 'bread',
  'cheese', 'meat', 'vegetable', 'fruit', 'seafood', 'lobster', 'shrimp',
  'salmon', 'tuna', 'beef', 'pork', 'lamb', 'duck', 'turkey', 'bacon',
  'eggs', 'toast', 'pancake', 'waffle', 'omelette', 'quiche', 'lasagna',
  'ravioli', 'spaghetti', 'fettuccine', 'penne', 'rigatoni', 'macaroni',
  'risotto', 'paella', 'stir fry', 'kebab', 'gyro', 'falafel', 'hummus',
  'guacamole', 'salsa', 'queso', 'nachos', 'enchilada', 'fajita', 'tamale',
  'pad thai', 'pho', 'ramen', 'udon', 'tempura', 'teriyaki', 'sashimi',
  'maki', 'nigiri', 'dumpling', 'spring roll', 'egg roll', 'fried rice',
  'lo mein', 'kung pao', 'general tso', 'orange chicken', 'sweet and sour',
  'mapo tofu', 'korean bbq', 'bulgogi', 'bibimbap', 'kimchi', 'japchae',
  'samosa', 'naan', 'roti', 'biryani', 'tandoori', 'butter chicken',
  'palak paneer', 'dal', 'chutney', 'raita', 'gulab jamun', 'kulfi',
  'baklava', 'tiramisu', 'creme brulee', 'chocolate', 'vanilla', 'strawberry',
  'mint', 'caramel', 'nutella', 'peanut butter', 'jam', 'jelly', 'honey',
  'syrup', 'whipped cream', 'sprinkles', 'nuts', 'berries', 'banana',
  'apple', 'orange', 'lemon', 'lime', 'mango', 'pineapple', 'coconut'
];

// Enthusiasm words that indicate strong positive sentiment
const ENTHUSIASM_WORDS = [
  'amazing', 'incredible', 'fantastic', 'outstanding', 'excellent', 'perfect',
  'delicious', 'mouthwatering', 'scrumptious', 'divine', 'heavenly', 'best',
  'favorite', 'love', 'adore', 'crazy about', 'obsessed with', 'must try',
  'highly recommend', 'definitely get', 'absolutely', 'phenomenal', 'spectacular'
];

// Sentiment analysis setup
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Function to extract place ID from Google Maps URL
function extractPlaceIdFromUrl(url) {
  console.log('🔍 Attempting to extract place ID from URL:', url);
  try {
    // Handle different Google Maps URL formats
    if (url.includes('maps.app.goo.gl')) {
      console.log('📱 Detected shortened goo.gl URL - will need to follow redirect');
      return null; // Will be handled in the scraping function
    }

    // Try to extract a valid Google Places API place ID (starts with ChIJ)
    const placeIdMatch = url.match(/ChIJ[\w-]+/);
    if (placeIdMatch) {
      console.log('✅ Found valid Google Places API place ID:', placeIdMatch[0]);
      return placeIdMatch[0];
    }

    // Fallback: extract restaurant name from /place/ path
    const nameMatch = url.match(/place\/([^/@]+)/);
    if (nameMatch) {
      const name = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
      console.log('📝 Using restaurant name for text search:', name);
      return name;
    }

    // Try to extract from the @ coordinates format
    const coordMatch = url.match(/@([^\/]+)/);
    if (coordMatch) {
      console.log('✅ Successfully extracted coordinates from URL:', coordMatch[1]);
      // For coordinates, we'll need to use a different approach
      return coordMatch[1];
    }

    console.log('❌ Could not extract place ID or restaurant name from URL');
    return null;
  } catch (error) {
    console.error('❌ Error extracting place ID:', error);
    return null;
  }
}

// Function to get restaurant details using Google Places API
async function getRestaurantDetails(placeId) {
  console.log('🏪 Fetching restaurant details from Places API for place ID:', placeId);
  
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.log('❌ Google Places API key not configured');
      throw new Error('Google Places API key not configured');
    }
    
    console.log('🌐 Making API request to:', `${PLACES_API_BASE_URL}/details/json`);
    const response = await axios.get(`${PLACES_API_BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        fields: 'name,rating,user_ratings_total,reviews,types,formatted_address,website,formatted_phone_number,opening_hours,price_level'
      }
    });
    
    console.log('📡 API Response Status:', response.data.status);
    
    if (response.data.status === 'OK') {
      console.log('✅ Successfully fetched restaurant details');
      console.log('📊 Restaurant Info:', {
        name: response.data.result.name,
        rating: response.data.result.rating,
        totalReviews: response.data.result.user_ratings_total,
        address: response.data.result.formatted_address
      });
      if (response.data.result.menu) {
        console.log('🍽️ Menu URL found in API response:', response.data.result.menu);
      } else {
        console.log('🍽️ No menu URL found in API response.');
      }
      return response.data.result;
    } else {
      console.log('❌ Places API error:', response.data.status);
      throw new Error(`Places API error: ${response.data.status}`);
    }
  } catch (error) {
    console.error('❌ Error fetching restaurant details:', error.message);
    throw error;
  }
}

// Function to get restaurant reviews using Google Places API
async function getRestaurantReviews(placeId) {
  console.log('📝 Fetching restaurant reviews from Places API for place ID:', placeId);
  
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.log('❌ Google Places API key not configured');
      throw new Error('Google Places API key not configured');
    }
    
    console.log('🌐 Making API request for reviews...');
    const response = await axios.get(`${PLACES_API_BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        fields: 'reviews'
      }
    });
    
    console.log('📡 Reviews API Response Status:', response.data.status);
    
    if (response.data.status === 'OK' && response.data.result.reviews) {
      const reviews = response.data.result.reviews.map(review => ({
        text: review.text,
        rating: review.rating,
        time: review.time,
        author_name: review.author_name
      }));
      console.log('✅ Successfully fetched', reviews.length, 'reviews from Places API');
      return reviews;
    } else {
      console.log('⚠️ No reviews found in API response');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching restaurant reviews:', error.message);
    return [];
  }
}

// Function to extract menu items from Google Maps
async function extractMenuItems(page) {
  try {
    // Try to find menu items in various Google Maps layouts
    const menuItems = await page.evaluate(() => {
      const items = new Set();
      
      // Method 1: Look for menu sections
      const menuSelectors = [
        '[data-menu-item]',
        '.menu-item',
        '[data-testid*="menu"]',
        '.section-header',
        '.dish-name',
        '.item-name'
      ];
      
      menuSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 100) {
            items.add(text.toLowerCase());
          }
        });
      });
      
      // Method 2: Look for popular dishes section
      const popularSelectors = [
        '[aria-label*="popular"]',
        '[aria-label*="Popular"]',
        '.popular-dishes',
        '.most-ordered'
      ];
      
      popularSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 100) {
            items.add(text.toLowerCase());
          }
        });
      });
      
      // Method 3: Look for dish names in reviews (as fallback)
      const reviewElements = document.querySelectorAll('[data-review-id], .jftiEf');
      reviewElements.forEach(el => {
        const text = el.textContent?.toLowerCase();
        if (text) {
          // Extract potential dish names (words that might be menu items)
          const words = text.split(/\s+/);
          words.forEach(word => {
            if (word.length > 3 && word.length < 20 && /^[a-zA-Z]+$/.test(word)) {
              // Check if it looks like a dish name
              if (FOOD_KEYWORDS.some(keyword => word.includes(keyword) || keyword.includes(word))) {
                items.add(word);
              }
            }
          });
        }
      });
      
      return Array.from(items);
    });
    
    console.log('Extracted menu items:', menuItems);
    return menuItems;
  } catch (error) {
    console.log('Failed to extract menu items, using fallback keywords');
    return FOOD_KEYWORDS;
  }
}

// Helper function to construct Google Maps menu page URL
function constructMenuPageUrl(googleMapsUrl) {
  // If the URL already contains !10e9, return as is
  if (googleMapsUrl.includes('!10e9')) return googleMapsUrl;
  // Try to insert !10e9 before the ? or at the end of the data string
  const match = googleMapsUrl.match(/(data=[^?]+)/);
  if (match) {
    const dataString = match[1];
    if (!dataString.includes('!10e9')) {
      const newDataString = dataString + '!10e9';
      return googleMapsUrl.replace(dataString, newDataString);
    }
  }
  // Fallback: just append !10e9 before ? if possible
  const idx = googleMapsUrl.indexOf('?');
  if (idx !== -1) {
    return googleMapsUrl.slice(0, idx) + '!10e9' + googleMapsUrl.slice(idx);
  }
  // Otherwise, append !10e9 at the end
  return googleMapsUrl + '!10e9';
}

// Function to scrape menu items from a Google Maps menu page
async function scrapeGoogleMapsMenuPage(menuUrl) {
  console.log('🗂️ Attempting to scrape menu page:', menuUrl);
  // const browser = await puppeteer.launch({ headless: false, args: [
  //   '--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security',
  //   '--disable-features=VizDisplayCompositor', '--disable-dev-shm-usage',
  //   '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
  //   '--disable-gpu', '--disable-blink-features=AutomationControlled',
  //   '--disable-extensions-except', '--disable-plugins-discovery', '--disable-default-apps'
  // ] });
  try {
    // const page = await browser.newPage();
    // await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    // await page.setViewport({ width: 1920, height: 1080 });
    // await page.goto(menuUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // await page.waitForTimeout(2000);
    // Try to extract menu items from the menu page
    const menuItems = await page.evaluate(() => {
      const items = new Set();
      // Google Maps menu page uses .GgK1If for dish names (as of July 2024)
      const dishEls = document.querySelectorAll('.GgK1If, .menu-item, .dish-name, .item-name');
      dishEls.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 2 && text.length < 100) {
          items.add(text.toLowerCase());
        }
      });
      // Also look for .GgK1If span children
      const spanEls = document.querySelectorAll('.GgK1If span');
      spanEls.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 2 && text.length < 100) {
          items.add(text.toLowerCase());
        }
      });
      return Array.from(items);
    });
    console.log('🍽️ Scraped menu items from menu page:', menuItems);
    return menuItems;
  } catch (error) {
    console.error('❌ Error scraping menu page:', error);
    return [];
  } finally {
    // await browser.close();
  }
}

// Function to extract place ID from goo.gl redirect using HTTP request
async function extractPlaceIdFromRedirect(url) {
  console.log('🌐 Following goo.gl redirect using HTTP request...');
  
  try {
    console.log('📡 Making HTTP request to follow redirect...');
    
    // Use axios to follow the redirect and get the final URL
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 10000,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      }
    });
    
    // Get the final URL from the response
    const finalUrl = response.request.res.responseUrl || response.config.url;
    console.log('✅ Final URL after redirect:', finalUrl);
    
    // Extract place ID from the final URL
    console.log('🔍 Extracting place ID from final URL...');
    return extractPlaceIdFromUrl(finalUrl);
  } catch (error) {
    console.error('❌ Error extracting place ID from redirect:', error.message);
    
    // Fallback: try to extract from the URL directly if it's already expanded
    if (url.includes('google.com/maps')) {
      console.log('🔄 Trying to extract place ID from expanded URL...');
      return extractPlaceIdFromUrl(url);
    }
    
    return null;
  }
}

// Function to get restaurant data using Google Places API
async function getRestaurantDataFromAPI(placeId) {
  console.log('\n🏪 Getting restaurant data from Google Places API...');
  
  try {
    // Check if placeId looks like coordinates
    if (placeId.includes(',')) {
      console.log('📍 Detected coordinates, using text search instead...');
      return await getRestaurantDataFromCoordinates(placeId);
    }
    
    // Check if placeId looks like a restaurant name (contains spaces, special characters, or invalid format)
    // Valid place IDs are typically long strings without spaces, colons, or plus signs
    if (placeId.includes('+') || placeId.includes(' ') || placeId.includes(':') || placeId.length < 20) {
      console.log('🏪 Detected restaurant name or invalid place ID, using text search instead...');
      return await getRestaurantDataFromName(placeId);
    }
    
    console.log('\n📋 Step 3a: Fetching restaurant details...');
    const details = await getRestaurantDetails(placeId);
    
    console.log('\n📝 Step 3b: Fetching restaurant reviews...');
    const reviews = await getRestaurantReviews(placeId);
    
    console.log('\n🍽️ Step 3c: Extracting menu items from reviews...');
    const menuItems = extractMenuItemsFromReviews(reviews);
    console.log('✅ Extracted', menuItems.length, 'menu items from reviews');
    
    console.log('\n🎉 Successfully completed API data retrieval!');
    return {
      reviews: reviews,
      menuItems: menuItems,
      restaurantDetails: details,
      isFromAPI: true
    };
  } catch (error) {
    console.error('\n❌ Error getting data from Places API:', error.message);
    throw error;
  }
}

// Function to get restaurant data using coordinates and text search
async function getRestaurantDataFromCoordinates(coordinates) {
  console.log('\n📍 Getting restaurant data using coordinates:', coordinates);
  
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }
    
    // Use text search to find the restaurant near the coordinates
    console.log('🔍 Searching for restaurant near coordinates...');
    const searchResponse = await axios.get(`${PLACES_API_BASE_URL}/textsearch/json`, {
      params: {
        query: 'restaurant',
        location: coordinates,
        radius: 100, // 100 meters radius
        key: GOOGLE_PLACES_API_KEY
      }
    });
    
    if (searchResponse.data.status === 'OK' && searchResponse.data.results.length > 0) {
      const restaurant = searchResponse.data.results[0];
      console.log('✅ Found restaurant:', restaurant.name);
      
      // Now get details using the place_id
      const details = await getRestaurantDetails(restaurant.place_id);
      const reviews = await getRestaurantReviews(restaurant.place_id);
      const menuItems = extractMenuItemsFromReviews(reviews);
      
      return {
        reviews: reviews,
        menuItems: menuItems,
        restaurantDetails: details,
        isFromAPI: true
      };
    } else {
      throw new Error('No restaurants found near coordinates');
    }
  } catch (error) {
    console.error('❌ Error getting data from coordinates:', error.message);
    throw error;
  }
}

// Function to get restaurant data using restaurant name from URL
async function getRestaurantDataFromName(restaurantName) {
  console.log('\n🏪 Getting restaurant data using restaurant name...');
  
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }
    
    // Decode the restaurant name (replace + with spaces)
    const decodedName = decodeURIComponent(restaurantName.replace(/\+/g, ' '));
    console.log('🔍 Searching for restaurant:', decodedName);
    
    // Use text search to find the restaurant
    const searchResponse = await axios.get(`${PLACES_API_BASE_URL}/textsearch/json`, {
      params: {
        query: decodedName,
        key: GOOGLE_PLACES_API_KEY
      }
    });
    
    console.log('📡 Text Search API Response Status:', searchResponse.data.status);
    
    if (searchResponse.data.status === 'OK' && searchResponse.data.results.length > 0) {
      const restaurant = searchResponse.data.results[0];
      console.log('✅ Found restaurant:', restaurant.name);
      console.log('📍 Restaurant place_id:', restaurant.place_id);
      
      // Now get details using the place_id
      const details = await getRestaurantDetails(restaurant.place_id);
      const reviews = await getRestaurantReviews(restaurant.place_id);
      const menuItems = extractMenuItemsFromReviews(reviews);
      
      return {
        reviews: reviews,
        menuItems: menuItems,
        restaurantDetails: details,
        isFromAPI: true
      };
    } else {
      console.log('❌ Text search failed:', searchResponse.data.status);
      throw new Error(`No restaurants found with name: ${decodedName}`);
    }
  } catch (error) {
    console.error('❌ Error getting data from restaurant name:', error.message);
    throw error;
  }
}

// Function to extract menu items from reviews
function extractMenuItemsFromReviews(reviews) {
  console.log('🔍 Extracting menu items from', reviews.length, 'reviews...');
  const menuItems = new Set();
  
  reviews.forEach((review, index) => {
    const text = review.text.toLowerCase();
    let foundInThisReview = 0;
    
    FOOD_KEYWORDS.forEach(keyword => {
      if (text.includes(keyword)) {
        menuItems.add(keyword);
        foundInThisReview++;
      }
    });
    
    if (foundInThisReview > 0) {
      console.log(`  📝 Review ${index + 1}: Found ${foundInThisReview} menu items`);
    }
  });
  
  const result = Array.from(menuItems);
  console.log('✅ Total unique menu items found:', result.length);
  return result;
}

// Function to extract reviews from Google Maps (scraping fallback)
async function scrapeGoogleMapsReviews(url) {
  console.log('\n🕷️ Starting web scraping fallback method...');
  console.log('🌐 Launching browser for scraping...');
  
  // const browser = await puppeteer.launch({ 
  //   headless: false, // Show the browser window for better stealth
  //   args: [
  //     '--no-sandbox', 
  //     '--disable-setuid-sandbox',
  //     '--disable-web-security',
  //     '--disable-features=VizDisplayCompositor',
  //     '--disable-dev-shm-usage',
  //     '--disable-accelerated-2d-canvas',
  //     '--no-first-run',
  //     '--no-zygote',
  //     '--disable-gpu',
  //     '--disable-blink-features=AutomationControlled',
  //     '--disable-extensions-except',
  //     '--disable-plugins-discovery',
  //     '--disable-default-apps'
  //   ]
  // });
  
  try {
    // const page = await browser.newPage();
    
    // // Set a more realistic user agent
    // await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // // Set viewport
    // await page.setViewport({ width: 1920, height: 1080 });
    
    // // Add extra headers to appear more like a real browser
    // await page.setExtraHTTPHeaders({
    //   'Accept-Language': 'en-US,en;q=0.9',
    //   'Accept-Encoding': 'gzip, deflate, br',
    //   'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //   'Cache-Control': 'no-cache',
    //   'Pragma': 'no-cache'
    // });
    
    // // Remove webdriver property to avoid detection
    // await page.evaluateOnNewDocument(() => {
    //   delete navigator.__proto__.webdriver;
    //   Object.defineProperty(navigator, 'webdriver', {
    //     get: () => undefined,
    //   });
    // });
    
    // console.log('Navigating to:', url);
    
    // // Navigate to the restaurant page with better error handling
    // try {
    //   await page.goto(url, { 
    //     waitUntil: 'domcontentloaded', 
    //     timeout: 45000 
    //   });
    // } catch (navigationError) {
    //   console.log('Navigation error, trying alternative approach:', navigationError.message);
    //   // Try with a different wait strategy
    //   await page.goto(url, { 
    //     waitUntil: 'load', 
    //     timeout: 45000 
    //   });
    // }
    
    // // For goo.gl URLs, wait for redirect to complete
    // if (url.includes('maps.app.goo.gl')) {
    //   console.log('Waiting for goo.gl redirect...');
    //   await page.waitForTimeout(5000); // Increased wait time
      
    //   // Check if we're still on the goo.gl URL
    //   const currentUrl = page.url();
    //   if (currentUrl.includes('goo.gl')) {
    //     console.log('Still on goo.gl, waiting longer...');
    //     await page.waitForTimeout(3000);
    //   }
    // }
    
    // // Add human-like random delay
    // const randomDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
    // console.log(`Waiting ${randomDelay}ms like a human...`);
    // await page.waitForTimeout(randomDelay);
    
    // // Extract menu items first
    // const menuItems = await extractMenuItems(page);
    
    // // Wait for reviews to load - try multiple selectors with better error handling
    // console.log('Looking for reviews...');
    // let reviewsFound = false;
    
    // const reviewSelectors = [
    //   '[data-review-id]',
    //   '.jftiEf',
    //   '[aria-label*="stars"]',
    //   '[aria-label*="star"]',
    //   '.review-text',
    //   '.review-content'
    // ];
    
    // for (const selector of reviewSelectors) {
    //   try {
    //     console.log(`Trying selector: ${selector}`);
    //     await page.waitForSelector(selector, { timeout: 8000 });
    //     console.log(`Found reviews with selector: ${selector}`);
    //     reviewsFound = true;
    //     break;
    //   } catch (error) {
    //     console.log(`Selector ${selector} failed:`, error.message);
    //     continue;
    //   }
    // }
    
    // if (!reviewsFound) {
    //   console.log('No review selectors found, proceeding anyway...');
    // }
    
    // // Try to handle consent screens if they appear
    // try {
    //   console.log('Checking for consent screens...');
    //   const consentSelectors = [
    //     'button[aria-label*="Accept"]',
    //     'button[aria-label*="Agree"]',
    //     'button:contains("Accept")',
    //     'button:contains("Agree")',
    //     'form[action*="consent"] button',
    //     '[data-action*="consent"]'
    //   ];
      
    //   for (const selector of consentSelectors) {
    //     try {
    //       const consentButton = await page.$(selector);
    //       if (consentButton) {
    //         console.log(`Found consent button: ${selector}`);
    //         await consentButton.click();
    //         await page.waitForTimeout(2000);
    //         break;
    //       }
    //     } catch (e) {
    //       // Continue to next selector
    //     }
    //   }
    // } catch (error) {
    //   console.log('No consent screen found or handled');
    // }
    
    // // Scroll to load more reviews with human-like behavior
    // console.log('Scrolling like a human to load more reviews...');
    // await page.evaluate(() => {
    //   return new Promise((resolve) => {
    //     let totalHeight = 0;
    //     const distance = Math.floor(Math.random() * 200) + 100; // Random scroll distance
    //     const timer = setInterval(() => {
    //       const scrollHeight = document.body.scrollHeight;
    //       window.scrollBy(0, distance);
    //       totalHeight += distance;
              
    //       // Add random pauses like a human
    //       if (Math.random() < 0.3) {
    //         clearTimeout(timer);
    //         setTimeout(() => {
    //           setInterval(() => {
    //             const scrollHeight = document.body.scrollHeight;
    //             window.scrollBy(0, distance);
    //             totalHeight += distance;
                
    //             if (totalHeight >= scrollHeight) {
    //               clearInterval(timer);
    //               resolve();
    //             }
    //           }, Math.floor(Math.random() * 200) + 100); // Random scroll speed
    //         }, Math.floor(Math.random() * 1000) + 500); // Random pause
    //       }
              
    //       if (totalHeight >= scrollHeight) {
    //         clearInterval(timer);
    //         resolve();
    //       }
    //     }, Math.floor(Math.random() * 200) + 100); // Random scroll speed
    //   });
    // });
    
    // // Wait a bit more like a human would
    // await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000);
    
    // // Extract review text
    // const reviews = await page.evaluate(() => {
    //   const reviews = [];
      
    //   // Try multiple selectors for different Google Maps layouts
    //   let reviewElements = document.querySelectorAll('[data-review-id]');
      
    //   if (reviewElements.length === 0) {
    //     // Try alternative selectors
    //     reviewElements = document.querySelectorAll('.jftiEf');
    //   }
      
    //   if (reviewElements.length === 0) {
    //     // Try finding elements with star ratings
    //     reviewElements = document.querySelectorAll('[aria-label*="stars"], [aria-label*="star"]');
    //   }
      
    //   reviewElements.forEach((element) => {
    //     let reviewText = '';
    //     let rating = null;
        
    //     // Try to find review text
    //     const textElement = element.querySelector('.jftiEf') || 
    //                        element.querySelector('[data-review-id]') ||
    //                        element.querySelector('.review-text') ||
    //                        element;
        
    //     if (textElement) {
    //       reviewText = textElement.textContent || textElement.innerText || '';
    //     }
        
    //     // Try to find rating
    //     const ratingElement = element.querySelector('[aria-label*="stars"]') ||
    //                          element.querySelector('[aria-label*="star"]') ||
    //                          element.closest('[aria-label*="stars"]') ||
    //                          element.closest('[aria-label*="star"]');
        
    //     if (ratingElement) {
    //       const ariaLabel = ratingElement.getAttribute('aria-label');
    //       const ratingMatch = ariaLabel.match(/(\d+)/);
    //       if (ratingMatch) {
    //         rating = parseInt(ratingMatch[1]);
    //       }
    //     }
        
    //     // Only add if we have meaningful review text
    //     if (reviewText.trim() && reviewText.length > 10) {
    //       reviews.push({
    //         text: reviewText.trim(),
    //         rating: rating
    //       });
    //     }
    //   });
      
    //   return reviews.slice(0, 50); // Limit to 50 reviews for performance
    // });
    
    // return { reviews, menuItems };

    // Fallback: Try a simpler approach with mock data for demonstration
    console.log('Using fallback approach with sample data...');
    
    // Return sample data for demonstration purposes
    const fallbackReviews = [
      {
        text: "Great food! The tacos are amazing and the service is friendly.",
        rating: 4
      },
      {
        text: "Delicious Mexican food. Love the authentic flavors and fresh ingredients.",
        rating: 5
      },
      {
        text: "Best Mexican restaurant in the area. The burritos are incredible!",
        rating: 5
      },
      {
        text: "Amazing tacos and burritos. Highly recommend this place!",
        rating: 4
      },
      {
        text: "Fresh and tasty Mexican food. The salsa is homemade and delicious.",
        rating: 4
      }
    ];
    
    const fallbackMenuItems = [
      'tacos',
      'burritos', 
      'enchiladas',
      'quesadillas',
      'guacamole',
      'salsa',
      'rice and beans',
      'churros'
    ];
    
    return { 
      reviews: fallbackReviews, 
      menuItems: fallbackMenuItems,
      isFallback: true 
    };
  } catch (error) {
    console.error('Error scraping reviews:', error);
    
    // Check if we got blocked or hit a CAPTCHA
    try {
      // const pageContent = await page.content();
      // if (pageContent.includes('captcha') || pageContent.includes('robot') || pageContent.includes('blocked')) {
      //   console.log('Detected blocking/CAPTCHA page, using fallback data');
      // }
    } catch (e) {
      console.log('Could not check page content for blocking');
    }
    
    // Fallback: Try a simpler approach with mock data for demonstration
    console.log('Using fallback approach with sample data...');
    
    // Return sample data for demonstration purposes
    const fallbackReviews = [
      {
        text: "Great food! The tacos are amazing and the service is friendly.",
        rating: 4
      },
      {
        text: "Delicious Mexican food. Love the authentic flavors and fresh ingredients.",
        rating: 5
      },
      {
        text: "Best Mexican restaurant in the area. The burritos are incredible!",
        rating: 5
      },
      {
        text: "Amazing tacos and burritos. Highly recommend this place!",
        rating: 4
      },
      {
        text: "Fresh and tasty Mexican food. The salsa is homemade and delicious.",
        rating: 4
      }
    ];
    
    const fallbackMenuItems = [
      'tacos',
      'burritos', 
      'enchiladas',
      'quesadillas',
      'guacamole',
      'salsa',
      'rice and beans',
      'churros'
    ];
    
    return { 
      reviews: fallbackReviews, 
      menuItems: fallbackMenuItems,
      isFallback: true 
    };
  } finally {
    // await browser.close();
  }
}

// Function to analyze reviews and extract dish recommendations
function analyzeReviewsWithMenu(reviews, menuItems) {
  const dishAnalysis = {};
  
  // Initialize analysis for each menu item
  menuItems.forEach(item => {
    dishAnalysis[item] = {
      mentions: 0,
      totalRating: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      enthusiasmMentions: 0,
      reviews: [],
      exactMatches: 0,
      partialMatches: 0
    };
  });
  
  reviews.forEach(review => {
    const text = review.text.toLowerCase();
    const words = text.split(/\s+/);
    const rating = review.rating || 3;
    
    // Check each menu item against the review
    menuItems.forEach(menuItem => {
      let matchType = null;
      
      // Check for exact matches first
      if (text.includes(menuItem)) {
        matchType = 'exact';
        dishAnalysis[menuItem].exactMatches++;
      }
      // Check for partial matches (menu item contains or is contained in review text)
      else if (menuItem.split(' ').some(word => text.includes(word)) || 
               text.split(' ').some(word => menuItem.includes(word))) {
        matchType = 'partial';
        dishAnalysis[menuItem].partialMatches++;
      }
      
      if (matchType) {
        dishAnalysis[menuItem].mentions++;
        dishAnalysis[menuItem].totalRating += rating;
        
        // Enhanced sentiment analysis
        const sentiment = analyzer.getSentiment(words);
        const hasEnthusiasm = ENTHUSIASM_WORDS.some(word => text.includes(word));
        
        if (sentiment > 0 || hasEnthusiasm) {
          dishAnalysis[menuItem].positiveMentions++;
          if (hasEnthusiasm) {
            dishAnalysis[menuItem].enthusiasmMentions++;
          }
        } else if (sentiment < 0) {
          dishAnalysis[menuItem].negativeMentions++;
        }
        
        dishAnalysis[menuItem].reviews.push({
          text: review.text,
          rating: rating,
          sentiment: sentiment,
          hasEnthusiasm: hasEnthusiasm,
          matchType: matchType
        });
      }
    });
  });
  
  // Calculate scores and sort dishes
  const dishScores = Object.entries(dishAnalysis)
    .filter(([dish, data]) => data.mentions >= 1) // Include dishes mentioned at least once
    .map(([dish, data]) => {
      const avgRating = data.totalRating / data.mentions;
      const positiveRatio = data.positiveMentions / data.mentions;
      const enthusiasmRatio = data.enthusiasmMentions / data.mentions;
      const exactMatchRatio = data.exactMatches / data.mentions;
      
      // Enhanced scoring formula with menu-specific weights
      const score = (
        (avgRating * 0.25) +           // Star ratings
        (positiveRatio * 0.25) +       // Sentiment analysis
        (data.mentions * 0.20) +       // Frequency
        (exactMatchRatio * 0.15) +     // Exact matches get bonus
        (enthusiasmRatio * 0.15)       // Enthusiasm level
      );
      
      return {
        dish: dish,
        score: score,
        mentions: data.mentions,
        exactMatches: data.exactMatches,
        partialMatches: data.partialMatches,
        avgRating: avgRating,
        positiveRatio: positiveRatio,
        enthusiasmRatio: enthusiasmRatio,
        reviews: data.reviews.slice(0, 3) // Top 3 reviews
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 dishes
  
  return dishScores;
}



// Replace the menu item extraction logic with unsupervised noun phrase extraction
function extractPopularDishesFromReviews(reviews) {
  const phraseCounts = {};
  for (const review of reviews) {
    if (review.rating >= 4) {
      // Extract noun phrases using compromise
      const doc = nlp(review.text);
      const phrases = doc.nouns().out('array');
      for (let phrase of phrases) {
        phrase = phrase.toLowerCase().trim();
        // Filter out generic terms and very short phrases
        if (
          phrase.length > 2 &&
          !['place', 'food', 'restaurant', 'service', 'staff', 'people', 'time', 'order', 'location', 'experience', 'meal', 'menu', 'spot', 'area', 'price', 'prices', 'wait', 'line', 'table', 'drink', 'drinks', 'day', 'night', 'guy', 'guys', 'girl', 'girls', 'man', 'woman', 'kid', 'kids', 'family', 'friend', 'friends', 'customer', 'customers', 'manager', 'owner', 'worker', 'workers', 'employee', 'employees', 'cashier', 'counter', 'bathroom', 'restroom', 'parking', 'lot', 'street', 'city', 'state', 'country', 'trip', 'visit', 'experience', 'review', 'reviews', 'star', 'stars', 'rating', 'ratings', 'order', 'orders', 'waiter', 'waitress', 'server', 'servers', 'host', 'hostess', 'chef', 'cook', 'cooks', 'kitchen', 'dish', 'dishes', 'portion', 'portions', 'size', 'sizes', 'taste', 'flavor', 'flavors', 'texture', 'textures', 'quality', 'quantity', 'amount', 'bit', 'bite', 'bites', 'piece', 'pieces', 'part', 'parts', 'thing', 'things', 'something', 'anything', 'everything', 'nothing', 'someone', 'anyone', 'everyone', 'nobody', 'somebody', 'anybody', 'everybody', 'thing', 'stuff', 'stuff', 'item', 'items', 'option', 'options', 'choice', 'choices', 'selection', 'selections', 'variety', 'varieties', 'type', 'types', 'kind', 'kinds', 'sort', 'sorts', 'range', 'ranges', 'mix', 'mixes', 'blend', 'blends', 'combination', 'combinations', 'pair', 'pairs', 'set', 'sets', 'group', 'groups', 'bunch', 'bunches', 'lot', 'lots', 'bottle', 'bottles', 'can', 'cans', 'cup', 'cups', 'glass', 'glasses', 'plate', 'plates', 'bowl', 'bowls', 'tray', 'trays', 'basket', 'baskets', 'box', 'boxes', 'bag', 'bags', 'container', 'containers', 'pack', 'packs', 'package', 'packages', 'carton', 'cartons', 'case', 'cases', 'wrapper', 'wrappers', 'napkin', 'napkins', 'utensil', 'utensils', 'fork', 'forks', 'knife', 'knives', 'spoon', 'spoons', 'chopstick', 'chopsticks', 'straw', 'straws', 'lid', 'lids', 'cover', 'covers', 'top', 'tops', 'bottom', 'bottoms', 'side', 'sides', 'edge', 'edges', 'corner', 'corners', 'center', 'centers', 'middle', 'middles', 'end', 'ends', 'start', 'starts', 'finish', 'finishes', 'beginning', 'beginnings', 'opening', 'closings', 'close', 'closes', 'open', 'opens', 'hour', 'hours', 'minute', 'minutes', 'second', 'seconds', 'moment', 'moments', 'time', 'times', 'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years', 'season', 'seasons', 'holiday', 'holidays', 'event', 'events', 'occasion', 'occasions', 'party', 'parties', 'celebration', 'celebrations', 'gathering', 'gatherings', 'meeting', 'meetings', 'appointment', 'appointments', 'reservation', 'reservations', 'booking', 'bookings', 'spot', 'spots', 'place', 'places', 'area', 'areas', 'region', 'regions', 'zone', 'zones', 'district', 'districts', 'neighborhood', 'neighborhoods', 'block', 'blocks', 'street', 'streets', 'road', 'roads', 'avenue', 'avenues', 'boulevard', 'boulevards', 'drive', 'drives', 'lane', 'lanes', 'way', 'ways', 'court', 'courts', 'circle', 'circles', 'plaza', 'plazas', 'square', 'squares', 'park', 'parks', 'lot', 'lots', 'garage', 'garages', 'structure', 'structures', 'building', 'buildings', 'floor', 'floors', 'level', 'levels', 'room', 'rooms', 'hall', 'halls', 'lobby', 'lobbies', 'entrance', 'entrances', 'exit', 'exits', 'door', 'doors', 'window', 'windows', 'wall', 'walls', 'ceiling', 'ceilings', 'roof', 'roofs', 'table', 'tables', 'chair', 'chairs', 'seat', 'seats', 'booth', 'booths', 'counter', 'counters', 'bar', 'bars', 'patio', 'patios', 'deck', 'decks', 'terrace', 'terraces', 'balcony', 'balconies', 'view', 'views', 'scene', 'scenes', 'sight', 'sights', 'atmosphere', 'ambiance', 'environment', 'setting', 'surroundings', 'decor', 'decoration', 'decorations', 'music', 'sound', 'sounds', 'noise', 'noises', 'light', 'lights', 'lighting', 'temperature', 'air', 'condition', 'conditions', 'weather', 'climate'].includes(phrase)
        ) {
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        }
      }
    }
  }
  // Sort by count descending
  return Object.entries(phraseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase, count]) => ({ phrase, count }));
}

// Use extractPopularDishesFromReviews in your analysis pipeline instead of the old menu item extraction

// Add this function before the API route definitions
async function getRestaurantData(url) {
  // Try Google Places API only
  try {
    const placeIdOrName = extractPlaceIdFromUrl(url);
    let apiResult = await getRestaurantDataFromAPI(placeIdOrName);
    let { reviews, menuItems, restaurantDetails, isFromAPI } = apiResult;
    // If no menuItems found, use unsupervised extraction from reviews
    if (!menuItems || menuItems.length === 0) {
      menuItems = extractPopularDishesFromReviews(reviews).map(x => x.phrase);
    }
    return {
      reviews,
      menuItems,
      restaurantDetails,
      isFromAPI: isFromAPI || false,
      isFallback: false
    };
  } catch (apiError) {
    console.error('Error getting restaurant data from API:', apiError.message);
    // If API fails, return fallback data
    return {
      reviews: [
        { text: "Great food! The tacos are amazing and the service is friendly.", rating: 4 },
        { text: "Delicious Mexican food. Love the authentic flavors and fresh ingredients.", rating: 5 },
        { text: "Best Mexican restaurant in the area. The burritos are incredible!", rating: 5 },
        { text: "Amazing tacos and burritos. Highly recommend this place!", rating: 4 },
        { text: "Fresh and tasty Mexican food. The salsa is homemade and delicious.", rating: 4 }
      ],
      menuItems: [
        'tacos', 'burritos', 'enchiladas', 'quesadillas', 'guacamole', 'salsa', 'rice and beans', 'churros'
      ],
      isFallback: true,
      isFromAPI: false
    };
  }
}

// API Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/analyze', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🍽️ NEW RESTAURANT ANALYSIS REQUEST');
  console.log('='.repeat(60));
  
  try {
    const { url } = req.body;
    
    if (!url || (!url.includes('google.com/maps') && !url.includes('maps.app.goo.gl'))) {
      console.log('❌ Invalid URL provided:', url);
      return res.status(400).json({ error: 'Please provide a valid Google Maps URL' });
    }
    
    console.log('📋 Request Details:');
    console.log('  URL:', url);
    console.log('  API Key:', GOOGLE_PLACES_API_KEY ? '✅ Configured' : '❌ Not configured');
    
    let result;
    try {
      result = await getRestaurantData(url);
    } catch (error) {
      // If both API and scraping fail, use fallback data
      console.error('\n💥 All methods failed, using fallback data:', error.message);
      result = {
        reviews: [
          { text: "Great food! The tacos are amazing and the service is friendly.", rating: 4 },
          { text: "Delicious Mexican food. Love the authentic flavors and fresh ingredients.", rating: 5 },
          { text: "Best Mexican restaurant in the area. The burritos are incredible!", rating: 5 },
          { text: "Amazing tacos and burritos. Highly recommend this place!", rating: 4 },
          { text: "Fresh and tasty Mexican food. The salsa is homemade and delicious.", rating: 4 }
        ],
        menuItems: [
          'tacos', 'burritos', 'enchiladas', 'quesadillas', 'guacamole', 'salsa', 'rice and beans', 'churros'
        ],
        isFallback: true,
        isFromAPI: false
      };
    }
    
    const { reviews, menuItems, isFallback, isFromAPI, restaurantDetails } = result;
    
    if (!reviews || reviews.length === 0) {
      console.log('❌ No reviews found for this restaurant');
      return res.status(404).json({ error: 'No reviews found for this restaurant' });
    }
    
    console.log('\n📊 Analysis Results:');
    console.log(`  📝 Reviews found: ${reviews.length}`);
    console.log(`  🍽️ Menu items found: ${menuItems.length}`);
    console.log(`  🔄 Data source: ${isFromAPI ? 'Google Places API' : isFallback ? 'Demo Data' : 'Web Scraping'}`);
    
    console.log('\n🧠 Analyzing reviews and generating recommendations...');
    const dishRecommendations = analyzeReviewsWithMenu(reviews, menuItems);
    console.log(`  🏆 Top recommendations generated: ${dishRecommendations.length}`);
    
    console.log('\n✅ Analysis completed successfully!');
    console.log('='.repeat(60));
    
    res.json({
      success: true,
      totalReviews: reviews.length,
      menuItemsFound: menuItems.length,
      recommendations: dishRecommendations,
      isFallback: isFallback || false,
      isFromAPI: isFromAPI || false,
      restaurantDetails: restaurantDetails || null
    });
    
  } catch (error) {
    console.error('\n❌ Error analyzing restaurant:', error.message);
    console.log('='.repeat(60));
    res.status(500).json({ 
      error: 'Failed to analyze restaurant reviews. Please try again.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 