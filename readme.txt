
Run in ExpoGo for local testing.
npm run start   


Promote to TestFlight

 npm install --global eas-cli  

eas init --id 929b54d4-93dd-4d1b-8e22-d493bb373a12

$env:EAS_NO_VCS="1"  

eas build -p ios --profile production
(https://expo.dev/accounts/)

eas submit -p ios --profile production --latest
(https://appstoreconnect.apple.com/)