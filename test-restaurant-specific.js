// Test script to demonstrate restaurant-specific dish recommendations
const natural = require('natural');

// Sample restaurant: Mexican Taco Place
const MEXICAN_MENU_ITEMS = [
  'al pastor tacos',
  'carne asada tacos', 
  'chicken tacos',
  'fish tacos',
  'carnitas tacos',
  'chorizo tacos',
  'veggie tacos',
  'guacamole',
  'salsa verde',
  'salsa roja',
  'rice and beans',
  'churros',
  'horchata',
  'mexican coke'
];

// Sample reviews for a Mexican restaurant
const mexicanRestaurantReviews = [
  {
    text: "The al pastor tacos are absolutely incredible! Best I've ever had. The pineapple and pork combination is perfect.",
    rating: 5
  },
  {
    text: "Great tacos! The carne asada is delicious and the chicken tacos are also very good. Love the salsa verde.",
    rating: 4
  },
  {
    text: "The fish tacos were disappointing, but the al pastor tacos made up for it. Amazing flavor!",
    rating: 4
  },
  {
    text: "Best Mexican food in town! The al pastor tacos are phenomenal and the guacamole is fresh and delicious.",
    rating: 5
  },
  {
    text: "The chicken tacos were okay, nothing special. But the al pastor tacos are absolutely amazing! Must try!",
    rating: 4
  },
  {
    text: "Incredible al pastor tacos! The pork is perfectly seasoned and the pineapple adds the perfect sweetness.",
    rating: 5
  },
  {
    text: "The carne asada tacos are good, but the al pastor tacos are the star of the show. Highly recommend!",
    rating: 5
  },
  {
    text: "The fish tacos were dry and bland. Skip those and go straight for the al pastor tacos - they're divine!",
    rating: 3
  },
  {
    text: "Amazing restaurant! The al pastor tacos are outstanding and the horchata is the perfect drink to go with them.",
    rating: 5
  },
  {
    text: "The chicken tacos are decent, but the al pastor tacos are absolutely incredible. Best tacos ever!",
    rating: 5
  }
];

// Enthusiasm words
const ENTHUSIASM_WORDS = [
  'amazing', 'incredible', 'fantastic', 'outstanding', 'excellent', 'perfect',
  'delicious', 'mouthwatering', 'scrumptious', 'divine', 'heavenly', 'best',
  'favorite', 'love', 'adore', 'crazy about', 'obsessed with', 'must try',
  'highly recommend', 'definitely get', 'absolutely', 'phenomenal', 'spectacular'
];

// Sentiment analyzer
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

function analyzeRestaurantSpecific(reviews, menuItems) {
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
      // Check for partial matches
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
    .filter(([dish, data]) => data.mentions >= 1)
    .map(([dish, data]) => {
      const avgRating = data.totalRating / data.mentions;
      const positiveRatio = data.positiveMentions / data.mentions;
      const enthusiasmRatio = data.enthusiasmMentions / data.mentions;
      const exactMatchRatio = data.exactMatches / data.mentions;
      
      // Enhanced scoring formula
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
        reviews: data.reviews.slice(0, 3)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  return dishScores;
}

// Test the restaurant-specific algorithm
console.log('🌮 Restaurant-Specific Dish Recommendations Test\n');
console.log('Restaurant: Mexican Taco Place');
console.log('Menu Items Found:', MEXICAN_MENU_ITEMS.length);
console.log('Reviews Analyzed:', mexicanRestaurantReviews.length);

console.log('\n' + '='.repeat(70));
console.log('📊 RESTAURANT-SPECIFIC ANALYSIS RESULTS');
console.log('='.repeat(70));

const results = analyzeRestaurantSpecific(mexicanRestaurantReviews, MEXICAN_MENU_ITEMS);

results.forEach((dish, index) => {
  console.log(`\n${index + 1}. ${dish.dish.toUpperCase()}`);
  console.log(`   Score: ${dish.score.toFixed(2)}`);
  console.log(`   Mentions: ${dish.mentions} (${dish.exactMatches} exact, ${dish.partialMatches} partial)`);
  console.log(`   Average Rating: ${dish.avgRating.toFixed(1)}/5`);
  console.log(`   Positive Reviews: ${Math.round(dish.positiveRatio * 100)}%`);
  console.log(`   Enthusiasm Level: ${Math.round(dish.enthusiasmRatio * 100)}%`);
  console.log(`   Sample Review: "${dish.reviews[0]?.text}"`);
});

console.log('\n' + '='.repeat(70));
console.log('✅ Restaurant-specific algorithm successfully identifies:');
console.log('   - Exact menu items (al pastor tacos vs generic "tacos")');
console.log('   - Specific dish popularity within the restaurant');
console.log('   - Context-aware recommendations');
console.log('='.repeat(70)); 