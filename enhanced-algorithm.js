// Enhanced Popularity Algorithm for Restaurant Dish Recommendations
const natural = require('natural');

// Enhanced food keywords with categories
const FOOD_KEYWORDS = {
  // Italian
  'pizza': { category: 'italian', variations: ['margherita', 'pepperoni', 'hawaiian', 'supreme'] },
  'pasta': { category: 'italian', variations: ['spaghetti', 'fettuccine', 'penne', 'rigatoni'] },
  'lasagna': { category: 'italian' },
  'risotto': { category: 'italian' },
  
  // American
  'burger': { category: 'american', variations: ['cheeseburger', 'bacon burger', 'veggie burger'] },
  'sandwich': { category: 'american', variations: ['club', 'blt', 'reuben'] },
  'steak': { category: 'american', variations: ['ribeye', 'filet', 'sirloin'] },
  
  // Asian
  'sushi': { category: 'asian', variations: ['maki', 'nigiri', 'sashimi', 'roll'] },
  'ramen': { category: 'asian' },
  'pad thai': { category: 'asian' },
  'curry': { category: 'asian', variations: ['red curry', 'green curry', 'yellow curry'] },
  
  // Mexican
  'taco': { category: 'mexican', variations: ['fish taco', 'beef taco', 'chicken taco'] },
  'burrito': { category: 'mexican' },
  'enchilada': { category: 'mexican' },
  
  // Desserts
  'dessert': { category: 'dessert', variations: ['cake', 'ice cream', 'tiramisu', 'chocolate'] },
  'cake': { category: 'dessert' },
  'ice cream': { category: 'dessert' },
  
  // Beverages
  'coffee': { category: 'beverage' },
  'tea': { category: 'beverage' },
  'cocktail': { category: 'beverage' }
};

// Enthusiasm words that indicate strong positive sentiment
const ENTHUSIASM_WORDS = [
  'amazing', 'incredible', 'fantastic', 'outstanding', 'excellent', 'perfect',
  'delicious', 'mouthwatering', 'scrumptious', 'divine', 'heavenly', 'best',
  'favorite', 'love', 'adore', 'crazy about', 'obsessed with', 'must try',
  'highly recommend', 'definitely get', 'absolutely', 'phenomenal', 'spectacular'
];

// Negative context words that might indicate dislike
const NEGATIVE_CONTEXT_WORDS = [
  'don\'t', 'avoid', 'skip', 'terrible', 'awful', 'disgusting', 'worst',
  'never', 'bad', 'disappointing', 'overrated', 'dry', 'bland', 'cold'
];

// Enhanced sentiment analyzer
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

function analyzeReviewsEnhanced(reviews) {
  const dishAnalysis = {};
  
  reviews.forEach((review, reviewIndex) => {
    const text = review.text.toLowerCase();
    const words = text.split(/\s+/);
    const rating = review.rating || 3;
    
    // Calculate review weight (longer reviews get more weight)
    const reviewWeight = Math.min(text.length / 100, 2.0); // Cap at 2x weight
    
    // Find food-related words in the review
    Object.entries(FOOD_KEYWORDS).forEach(([keyword, info]) => {
      if (text.includes(keyword)) {
        if (!dishAnalysis[keyword]) {
          dishAnalysis[keyword] = {
            mentions: 0,
            totalRating: 0,
            positiveMentions: 0,
            negativeMentions: 0,
            enthusiasmMentions: 0,
            specificMentions: 0,
            recentMentions: 0,
            reviews: [],
            category: info.category,
            variations: new Set()
          };
        }
        
        // Basic mention counting
        dishAnalysis[keyword].mentions++;
        dishAnalysis[keyword].totalRating += rating;
        
        // Enhanced sentiment analysis
        const sentiment = analyzer.getSentiment(words);
        const hasEnthusiasm = ENTHUSIASM_WORDS.some(word => text.includes(word));
        const hasNegativeContext = NEGATIVE_CONTEXT_WORDS.some(word => text.includes(word));
        
        // Check for context (simple approach)
        const keywordIndex = text.indexOf(keyword);
        const surroundingText = text.substring(Math.max(0, keywordIndex - 50), keywordIndex + 50);
        const isPositiveContext = !hasNegativeContext && (sentiment > 0 || hasEnthusiasm);
        
        if (isPositiveContext) {
          dishAnalysis[keyword].positiveMentions++;
          if (hasEnthusiasm) {
            dishAnalysis[keyword].enthusiasmMentions++;
          }
        } else if (sentiment < 0 || hasNegativeContext) {
          dishAnalysis[keyword].negativeMentions++;
        }
        
        // Check for specificity (detailed descriptions)
        if (info.variations) {
          const hasVariation = info.variations.some(variation => text.includes(variation));
          if (hasVariation) {
            dishAnalysis[keyword].specificMentions++;
            info.variations.forEach(variation => {
              if (text.includes(variation)) {
                dishAnalysis[keyword].variations.add(variation);
              }
            });
          }
        }
        
        // Recency bonus (assuming reviews are in chronological order)
        const recencyBonus = Math.max(0, (reviews.length - reviewIndex) / reviews.length);
        dishAnalysis[keyword].recentMentions += recencyBonus;
        
        dishAnalysis[keyword].reviews.push({
          text: review.text,
          rating: rating,
          sentiment: sentiment,
          hasEnthusiasm: hasEnthusiasm,
          isPositiveContext: isPositiveContext,
          reviewWeight: reviewWeight,
          recencyBonus: recencyBonus
        });
      }
    });
  });
  
  // Calculate enhanced scores
  const dishScores = Object.entries(dishAnalysis).map(([dish, data]) => {
    const avgRating = data.totalRating / data.mentions;
    const positiveRatio = data.positiveMentions / data.mentions;
    const enthusiasmRatio = data.enthusiasmMentions / data.mentions;
    const specificityRatio = data.specificMentions / data.mentions;
    const recencyScore = data.recentMentions / data.mentions;
    
    // Enhanced scoring formula
    const score = (
      (avgRating * 0.25) +           // Star ratings
      (positiveRatio * 0.25) +       // Sentiment analysis
      (data.mentions * 0.15) +       // Frequency (normalized)
      (recencyScore * 0.15) +        // Recency bonus
      (enthusiasmRatio * 0.10) +     // Enthusiasm level
      (specificityRatio * 0.10)      // Specificity bonus
    );
    
    return {
      dish: dish,
      score: score,
      mentions: data.mentions,
      avgRating: avgRating,
      positiveRatio: positiveRatio,
      enthusiasmRatio: enthusiasmRatio,
      specificityRatio: specificityRatio,
      recencyScore: recencyScore,
      category: data.category,
      variations: Array.from(data.variations),
      reviews: data.reviews.slice(0, 3),
      confidence: calculateConfidence(data)
    };
  });
  
  return dishScores
    .filter(dish => dish.mentions >= 2) // Only dishes mentioned at least twice
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 dishes
}

function calculateConfidence(data) {
  // Calculate confidence based on data quality
  const factors = [
    data.mentions >= 5 ? 1.0 : data.mentions / 5, // More mentions = higher confidence
    data.positiveMentions / data.mentions, // Higher positive ratio = higher confidence
    data.enthusiasmMentions > 0 ? 1.0 : 0.5, // Enthusiasm indicates strong opinions
    data.specificMentions > 0 ? 1.0 : 0.7 // Specific mentions are more reliable
  ];
  
  return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
}

// Sample usage and testing
const sampleReviews = [
  {
    text: "The margherita pizza here is absolutely amazing! Best pizza I've ever had. The crust is perfect and the fresh basil makes it incredible.",
    rating: 5
  },
  {
    text: "Great Italian restaurant. The spaghetti carbonara is delicious, especially with the creamy sauce. Highly recommend!",
    rating: 4
  },
  {
    text: "The pizza was good but the service was slow. The garlic bread was also tasty.",
    rating: 3
  },
  {
    text: "Amazing food! The pepperoni pizza and pasta are both excellent. The tiramisu dessert was the perfect ending to our meal.",
    rating: 5
  },
  {
    text: "The chicken parmesan was disappointing, but the pizza made up for it. Great atmosphere.",
    rating: 4
  },
  {
    text: "Best Italian food in town! The pizza is incredible and the pasta dishes are authentic. Love this place!",
    rating: 5
  },
  {
    text: "The pizza was okay, nothing special. The pasta was better. Service was friendly though.",
    rating: 3
  },
  {
    text: "Excellent restaurant! The margherita pizza is outstanding and the tiramisu is to die for. Will definitely come back.",
    rating: 5
  }
];

// Test the enhanced algorithm
console.log('🍽️ Enhanced Popularity Algorithm Test\n');

const enhancedResults = analyzeReviewsEnhanced(sampleReviews);

console.log('📊 ENHANCED ANALYSIS RESULTS');
console.log('='.repeat(60));

enhancedResults.forEach((dish, index) => {
  console.log(`\n${index + 1}. ${dish.dish.toUpperCase()} (${dish.category})`);
  console.log(`   Score: ${dish.score.toFixed(2)} (Confidence: ${(dish.confidence * 100).toFixed(0)}%)`);
  console.log(`   Mentions: ${dish.mentions}`);
  console.log(`   Average Rating: ${dish.avgRating.toFixed(1)}/5`);
  console.log(`   Positive Reviews: ${Math.round(dish.positiveRatio * 100)}%`);
  console.log(`   Enthusiasm Level: ${Math.round(dish.enthusiasmRatio * 100)}%`);
  console.log(`   Specificity: ${Math.round(dish.specificityRatio * 100)}%`);
  if (dish.variations.length > 0) {
    console.log(`   Variations: ${dish.variations.join(', ')}`);
  }
  console.log(`   Sample Review: "${dish.reviews[0]?.text}"`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Enhanced algorithm provides more nuanced analysis!');
console.log('='.repeat(60)); 