const {
    MarketV2OPT,
    MAINNET_PROGRAM_ID,
    DEVNET_PROGRAM_ID
} = require('raydium-sdk-opt')

const {
    connection,
    makeTxVersion,
} = require('../config.js')
const { buildAndSendTx } = require('./util') 
async function createMarket(input) {
    const RAYDIUM_PROGRAM_ID = process.env.NETWORK == 'mainnet' ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID

     const createMarketInstruments = await MarketV2OPT.makeCreateMarketInstructionSimple({
        connection,
        wallet: input.wallet.publicKey,
        baseInfo: input.baseToken,
        quoteInfo: input.quoteToken,
        lotSize: input.lotSize,  
        tickSize: input.tickSize,  
        dexProgramId: RAYDIUM_PROGRAM_ID.OPENBOOK_MARKET,
        makeTxVersion,
    })

    marketId = createMarketInstruments.address.marketId

    txids = await buildAndSendTx(createMarketInstruments.innerTransactions, { skipPreflight: true })
    console.log('Market Created')
    console.log('Create Market Transactions :', txids)
    console.log('Market Address :', marketId)

    return marketId
}

 

module.exports = {
    createMarket
};