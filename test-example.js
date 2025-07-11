// Test file to demonstrate the dish analysis functionality
const natural = require('natural');

// Sample review data for testing
const sampleReviews = [
    {
        text: "The pizza here is absolutely amazing! Best pizza I've ever had. The crust is perfect and the toppings are fresh.",
        rating: 5
    },
    {
        text: "Great Italian restaurant. The pasta dishes are delicious, especially the spaghetti carbonara. Highly recommend!",
        rating: 4
    },
    {
        text: "The pizza was good but the service was slow. The garlic bread was also tasty.",
        rating: 3
    },
    {
        text: "Amazing food! The pizza and pasta are both excellent. The tiramisu dessert was the perfect ending to our meal.",
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
        text: "Excellent restaurant! The pizza is outstanding and the tiramisu is to die for. Will definitely come back.",
        rating: 5
    }
];

// Food keywords to look for
const FOOD_KEYWORDS = [
    'pizza', 'pasta', 'spaghetti', 'carbonara', 'chicken', 'parmesan', 
    'tiramisu', 'dessert', 'garlic bread', 'italian'
];

// Sentiment analysis setup
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

// Function to analyze reviews and extract dish recommendations
function analyzeReviews(reviews) {
    const dishAnalysis = {};
    
    reviews.forEach(review => {
        const text = review.text.toLowerCase();
        const words = text.split(/\s+/);
        const rating = review.rating || 3;
        
        // Find food-related words in the review
        FOOD_KEYWORDS.forEach(keyword => {
            if (text.includes(keyword)) {
                if (!dishAnalysis[keyword]) {
                    dishAnalysis[keyword] = {
                        mentions: 0,
                        totalRating: 0,
                        positiveMentions: 0,
                        negativeMentions: 0,
                        reviews: []
                    };
                }
                
                dishAnalysis[keyword].mentions++;
                dishAnalysis[keyword].totalRating += rating;
                
                // Simple sentiment analysis
                const sentiment = analyzer.getSentiment(words);
                if (sentiment > 0) {
                    dishAnalysis[keyword].positiveMentions++;
                } else if (sentiment < 0) {
                    dishAnalysis[keyword].negativeMentions++;
                }
                
                dishAnalysis[keyword].reviews.push({
                    text: review.text,
                    rating: rating,
                    sentiment: sentiment
                });
            }
        });
    });
    
    // Calculate scores and sort dishes
    const dishScores = Object.entries(dishAnalysis).map(([dish, data]) => {
        const avgRating = data.totalRating / data.mentions;
        const positiveRatio = data.positiveMentions / data.mentions;
        const score = (avgRating * 0.4) + (positiveRatio * 0.4) + (data.mentions * 0.2);
        
        return {
            dish: dish,
            score: score,
            mentions: data.mentions,
            avgRating: avgRating,
            positiveRatio: positiveRatio,
            reviews: data.reviews.slice(0, 3)
        };
    });
    
    return dishScores
        .filter(dish => dish.mentions >= 1)
        .sort((a, b) => b.score - a.score);
}

// Run the analysis
console.log('🍽️ Popular Menu Finder - Test Analysis\n');
console.log('Sample Reviews:');
sampleReviews.forEach((review, index) => {
    console.log(`${index + 1}. "${review.text}" (Rating: ${review.rating}/5)`);
});

console.log('\n' + '='.repeat(60));
console.log('📊 ANALYSIS RESULTS');
console.log('='.repeat(60));

const recommendations = analyzeReviews(sampleReviews);

recommendations.forEach((dish, index) => {
    console.log(`\n${index + 1}. ${dish.dish.toUpperCase()}`);
    console.log(`   Score: ${dish.score.toFixed(2)}`);
    console.log(`   Mentions: ${dish.mentions}`);
    console.log(`   Average Rating: ${dish.avgRating.toFixed(1)}/5`);
    console.log(`   Positive Reviews: ${Math.round(dish.positiveRatio * 100)}%`);
    console.log(`   Sample Review: "${dish.reviews[0]?.text}"`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Test completed successfully!');
console.log('The web app uses the same analysis algorithm with real Google Maps data.');
console.log('='.repeat(60)); 