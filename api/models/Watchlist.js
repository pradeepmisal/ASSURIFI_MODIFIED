import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    contractAddress: {
        type: String,
        required: true,
        trim: true
    },
    tokenName: {
        type: String,
        required: true,
        trim: true
    },
    chainId: {
        type: String,
        default: 'ethereum'
    },
    lastRiskScore: {
        type: Number,
        default: null
    },
    analysisType: {
        type: String,
        enum: ['AUDIT', 'SENTIMENT', 'LIQUIDITY'],
        default: 'AUDIT'
    },
    notes: {
        type: String,
        default: '',
        maxlength: 500
    },
    pinnedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate pins for the same user + contract
watchlistSchema.index({ userId: 1, contractAddress: 1 }, { unique: true });

export default mongoose.model('Watchlist', watchlistSchema);
