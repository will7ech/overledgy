# Overledgy - Overledger API Demo Todo App

A simple yet comprehensive demonstration of interacting with blockchain technologies through Overledger API. This Todo app allows you to create, manage, and track your tasks on the Ethereum Sepolia testnet.

**Watch the demo video:**
[![YouTube](https://i3.ytimg.com/vi/JyglRfUYvNk/maxresdefault.jpg)](https://www.youtube.com/watch?v=JyglRfUYvNk)

## Features

- **Modern UI**: Clean dark-themed interface with responsive design
- **Blockchain Interaction**: Create and toggle todo items stored on the blockchain
- **Live Console**: Real-time feedback about blockchain transactions
- **Wallet Integration**: Uses your Ethereum wallet to sign transactions
- **Balance Checking**: View your current wallet balance

## Why a Todo App?

This simple application demonstrates the main characteristics of blockchain interaction:

- Create and manage authentication tokens
- Read data from the blockchain
- Write data with wallet signature

All operations are performed via the Overledger API, making this an excellent learning tool for blockchain developers.

## Requirements

- Node.js 20+
- Overledger Application credentials
- Ethereum Sepolia wallet funded with test tokens

## Setup

1. Clone this repository
2. Create a `.env` file in the root directory based on `.env.example`
3. Install dependencies.
4. Start the application:

5. Access the application at `http://localhost:3001`

## How It Works

1. **Authentication**: Get an auth token using your Overledger API credentials
2. **Read Operations**: Fetch your todos and wallet balance from the blockchain
3. **Write Operations**: Add new todos or toggle existing ones, with each operation creating a blockchain transaction
4. **Transaction Tracking**: Monitor your transactions in real-time with Etherscan links

## Project Structure

- `server.js` - Express server handling API routes and blockchain interactions
- `public/assets/js/general.js` - Client-side JavaScript for UI interactions
- `public/assets/css/styles.css` - Modern dark-themed styling
- `views/index.ejs` - Main application view

## Contributing

Feel free to fork this repository and submit pull requests. Any contributions to improve the app or extend its functionality are welcome!

## License

DWTFYW. (Do Whatever The F*ck You Want) License.