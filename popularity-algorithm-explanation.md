# 🍽️ Popularity Algorithm Analysis

## Current Algorithm Breakdown

The app determines dish popularity using a **weighted scoring system** that combines multiple factors:

### 📊 **Current Scoring Formula**
```javascript
score = (avgRating × 0.4) + (positiveRatio × 0.4) + (mentions × 0.2)
```

### 🔍 **What Each Factor Measures**

1. **Average Rating (40% weight)**
   - Calculates the mean star rating for reviews mentioning each dish
   - Range: 1-5 stars
   - Example: Pizza mentioned in 5 reviews with ratings [5,4,5,3,5] = 4.4 avg

2. **Positive Sentiment Ratio (40% weight)**
   - Percentage of reviews with positive sentiment for each dish
   - Uses AFINN lexicon for sentiment analysis
   - Range: 0-100%
   - Example: 3 out of 5 pizza reviews are positive = 60%

3. **Number of Mentions (20% weight)**
   - Raw count of how many times a dish is mentioned
   - Simple frequency metric
   - Example: Pizza mentioned 7 times across all reviews

### 🎯 **Current Process**

1. **Text Analysis**: Scans review text for food keywords
2. **Sentiment Analysis**: Uses natural language processing to determine positive/negative tone
3. **Rating Aggregation**: Collects star ratings for each dish mention
4. **Score Calculation**: Applies weighted formula
5. **Filtering**: Only includes dishes mentioned ≥2 times
6. **Ranking**: Sorts by score (highest first)

## 🚀 **Proposed Improvements**

### **Enhanced Scoring Algorithm**
```javascript
// New weighted formula with more factors
score = (
  (avgRating × 0.25) +           // Star ratings
  (positiveRatio × 0.25) +       // Sentiment analysis
  (mentions × 0.15) +            // Frequency
  (recentMentions × 0.15) +      // Recency bonus
  (enthusiasmScore × 0.10) +     // Excitement level
  (specificityBonus × 0.10)      // Detailed mentions
)
```

### **New Factors to Add**

1. **Recency Weighting**
   - Recent reviews get higher weight
   - Reflects current popularity trends

2. **Enthusiasm Detection**
   - Look for words like "amazing", "incredible", "best ever"
   - Higher weight for passionate recommendations

3. **Specificity Bonus**
   - Detailed descriptions get bonus points
   - "The margherita pizza with fresh basil" > "pizza"

4. **Context Analysis**
   - Consider surrounding words
   - "Don't get the pizza" vs "The pizza is amazing"

5. **Review Length Bonus**
   - Longer reviews mentioning dishes get more weight
   - Indicates more thoughtful feedback

## 📈 **Example Calculation**

### **Current Method**
```
Pizza:
- Avg Rating: 4.2/5
- Positive Ratio: 80%
- Mentions: 5
- Score: (4.2 × 0.4) + (0.8 × 0.4) + (5 × 0.2) = 3.28

Burger:
- Avg Rating: 4.5/5
- Positive Ratio: 100%
- Mentions: 3
- Score: (4.5 × 0.4) + (1.0 × 0.4) + (3 × 0.2) = 3.4
```

### **Enhanced Method**
```
Pizza:
- Avg Rating: 4.2/5
- Positive Ratio: 80%
- Mentions: 5
- Recent Mentions: 4 (last 6 months)
- Enthusiasm: 3 "amazing" mentions
- Specificity: 2 detailed descriptions
- Score: 3.85

Burger:
- Avg Rating: 4.5/5
- Positive Ratio: 100%
- Mentions: 3
- Recent Mentions: 1
- Enthusiasm: 1 "good" mention
- Specificity: 0 detailed descriptions
- Score: 3.65
```

## 🛠️ **Implementation Plan**

1. **Add Review Timestamps** (if available)
2. **Enhance Sentiment Analysis** with custom food-specific lexicon
3. **Implement Enthusiasm Detection**
4. **Add Specificity Scoring**
5. **Create Configurable Weights**
6. **Add Confidence Scores**

## 🎯 **Benefits of Improvements**

- **More Accurate**: Better reflects true popularity
- **Trend Aware**: Considers recent vs old reviews
- **Context Sensitive**: Understands positive vs negative mentions
- **Detailed Insights**: Provides reasoning for recommendations
- **Customizable**: Can adjust weights based on preferences

## 📊 **Current Limitations**

1. **Simple Keyword Matching**: Doesn't understand context
2. **Equal Weight**: All mentions treated equally
3. **No Recency**: Old and new reviews weighted the same
4. **Limited Sentiment**: Basic positive/negative classification
5. **No Dish Variations**: "Margherita pizza" and "pepperoni pizza" treated as same

## 🔮 **Future Enhancements**

1. **Machine Learning**: Train on labeled data
2. **Dish Categorization**: Group similar dishes
3. **Seasonal Analysis**: Consider time-based trends
4. **User Preferences**: Personalized recommendations
5. **Cross-Restaurant Analysis**: Compare across similar restaurants 