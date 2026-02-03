
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




GIT
git config --global user.name "Joshua Thurman"
git config --global user.email "joshmthurman@gmail.com"
git config --global --list

git remote add origin https://github.com/joshmthurman-cloud/HexLogic.git
git remote -v

git branch -M main
git push -u origin main



git add "terminal-builder"
git commit -m "Add terminal-builder"
git push

git add readme.txt
git commit -m "Update readme"
git push


First time on the other PC (if the repo is NOT there yet)
cd C:\Development
git clone https://github.com/joshmthurman-cloud/Development.git

Every time after that (normal workflow)
cd C:\Development
git pull




