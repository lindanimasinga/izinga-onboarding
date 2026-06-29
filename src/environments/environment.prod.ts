export const environment = {
  production: true,
  izingaUrl : 'https://api.izinga.co.za',
  appVersion: '2.1.2',
  firebase_apiKey: "AIzaSyB1KhGf_VDF8VDUT0pNddLXB1Hls_dtR0U",
  firebaseVapidKey: "BBTAcjDdxSYob_-MRhZiBbrzOaW4qvyLQjHiZEsmVq8S3LXHZMrXBvsixmiIs8VYVFrlRaaZUeEPEGuUc-pM39A",
  apiKey: "AIzaSyB1KhGf_VDF8VDUT0pNddLXB1Hls_dtR0U",
  authDomain: "ijudi-d19bd.firebaseapp.com",
  databaseURL: "https://ijudi-d19bd.firebaseio.com",
  projectId: "ijudi-d19bd",
  storageBucket: "cs-clothing.appspot.com",
  messagingSenderId: "315529266651",
  appId: "1:315529266651:web:b28ea03f57c4d432ed53fe",
  measurementId: "G-ZJRDF78RJX",
  userTypeConfig: {
    defaultUserType: 'driver',
    hostnameToUserType: {
      'driver.izinga.co.za': 'driver',
      'biz.izinga.co.za': 'shop',
      'earn.izinga.co.za': 'individual'
    },
    bodyClassByUserType: {
      shop: 'shop',
      driver: 'driver',
      individual: 'individual'
    },
    bodyUserTypeClasses: ['shop', 'driver', 'individual', 'indivisual'],
    manifestByUserType: {
      shop: '/assets/manifest.shop.json',
      driver: '/assets/manifest.driver.json',
      individual: '/assets/manifest.individual.json'
    },
    heroCopy: {
      '': {
        heading: 'Get Paid Instantly',
        description: 'List your products and services, attract customers, and get paid with daily payouts and easy withdrawals'
      },
      shop: {
        heading: 'Sell Online with Ease',
        description: 'List your products and services, attract customers, and get paid with daily payouts and easy withdrawals'
      },
      individual: {
        heading: 'Receive Payments Seamlessly',
        description: 'Receive payments or tips directly into your bank account or cellphone number and withdraw from any ATM easily.'
      },
      driver: {
        heading: 'Join As A Driver',
        description: 'Join our delivery network and earn by delivering items for local businesses and individuals. Sign up to become a driver and start earning today!'
      }
    },
    signupCards: {
      shop: {
        title: 'Sign up to sell online',
        description: 'Register to list your shop on iZinga, reach more customers, and enjoy seamless transactions with daily payouts.',
        cta: 'Start as a shop',
        route: './business'
      },
      individual: {
        title: 'Sign up to receive tips and payments',
        description: 'Sign up as an individual to receive payments or tips directly into your bank account or cellphone number and withdraw from any ATM easily.',
        cta: 'Start as an individual',
        route: './indivisuals'
      },
      driver: {
        title: 'Become A Driver',
        description: 'Join our delivery network and earn by delivering items for local businesses and individuals. Sign up to become a driver and start earning today!',
        cta: 'Start as a driver',
        route: './indivisuals'
      }
    },
    seo: {
      shop: {
        title: 'Sell Online with Ease | Join iZinga as a Shop',
        description: 'List your products and services on iZinga, reach more customers, and get paid with daily payouts.',
        keywords: 'iZinga, Shop Registration, Sell Online, Business Signup, Daily Payouts, Local Commerce, Merchant Platform',
        ogTitle: 'Sell Online with Ease | Join iZinga as a Shop',
        ogDescription: 'Register your shop on iZinga and start selling online with easy payouts and local reach.',
        twitterTitle: 'Sell Online with Ease | Join iZinga as a Shop',
        twitterDescription: 'Register your shop on iZinga and grow with daily payouts and seamless transactions.'
      },
      driver: {
        title: 'Earn Money With Your Vehicle | Join iZinga as a Driver',
        description: 'Earn money with your vehicle. Sign up on iZinga to become a driver and start receiving delivery orders.',
        keywords: 'iZinga, Driver Jobs, Delivery Driver, Earn Money, Vehicle Monetization, Flexible Work, Driver Registration, Side Hustle',
        ogTitle: 'Earn Money With Your Vehicle | Join iZinga as a Driver',
        ogDescription: 'Sign up as an iZinga driver, receive delivery orders, and earn with flexible work.',
        twitterTitle: 'Earn Money With Your Vehicle | Join iZinga as a Driver',
        twitterDescription: 'Sign up on iZinga to become a driver and start earning from delivery orders.'
      },
      individual: {
        title: 'Receive Payments Seamlessly | Join iZinga as an Individual',
        description: 'Sign up as an individual on iZinga to receive payments or tips directly to your bank account or cellphone.',
        keywords: 'iZinga, Individual Signup, Receive Payments, Receive Tips, Easy Withdrawals, eWallet, Bank Payouts',
        ogTitle: 'Receive Payments Seamlessly | Join iZinga as an Individual',
        ogDescription: 'Join iZinga as an individual and receive payments or tips with easy withdrawals.',
        twitterTitle: 'Receive Payments Seamlessly | Join iZinga as an Individual',
        twitterDescription: 'Sign up as an individual on iZinga and receive payments or tips directly.'
      }
    }
  }
};
