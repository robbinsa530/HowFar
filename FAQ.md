# FAQ

## Why doesn't my map show up on Strava?
Strava only allows maps to be uploaded as `.gpx` files, like the ones produced by a GPS watch. When these files are uploaded to Strava, their time and position data are used to determine pace at each point along the route. This is how Strava determines things like segment records and crowns.

Since HowFar has no way of knowing your pace along each segment of a route, the best it could do is average your pace along the entire route based on total time and distance, and create & upload a "fake" `.gpx` file made from that small amount of info.

Unfortunately, while this is possible, this method has no way of accounting for things like hills, or an athlete speeding up/slowing down. Even though your pace may have varied throughout your activity, it will be averaged (which means the file will overestimate your pace for parts and underestimate your pace for parts). So oftentimes when doing this, an activity can get awarded Strava accoladates that aren't actually deserved. This is a big problem that would create a bad reputation for HowFar.

Because there's no way around this problem at the moment, maps can not be uploaded from HowFar. Rather HowFar uploads all activities as manual Strava activities with just total time, distance and text info.

__If you would like to vote to change this, allowing your maps to be posted to Strava in an easy, fair way, please consider giving kudos to [this Strava Community post](https://communityhub.strava.com/t5/ideas/add-the-ability-for-athletes-to-use-route-course-files-no-time/idi-p/31322).__

## How is HowFar compatible with Strava?
HowFar allows a user to connect to Strava by logging in using the "Connect with Strava" button in the menu. Then, you can post manual activities to Strava which will be auto populated with the distance of your mapped route. This is done using the "Post Activity" button in the menu.

## Does HowFar save any of my data?
HowFar saves a single piece of information about you, and it only does so if you choose to connect to Strava on the site using the "Connect with Strava" button in the menu. If you do this, a refresh token will be saved in your browser. This allows HowFar to keep you connected to Strava without you having to re-log-in every time you want to post an activity. This token is saved for 180 days (meaning you will need to re-log-in to Strava every 180 days). If you would like to delete this token, simply clear cookies/site-data for HowFar in your browser.

## Does HowFar work on mobile?
Technically yes, but the site is developed for desktop first and that's where you'll have the better experience. I do plan on developing proper mobile app versions (for Android and iOS) in the future.

## I really don't need a user account?
Nope! No one wants to make an account to do something as trivial as mapping a run or a bike ride. There is no reason you should have to setup a whole account for something so simple.

It's possible that in the future features could be added to HowFar that would necessitate creating an account, but if that happens, an account will __only__ be required to use those specific features.

## I found a bug. Who do I tell?
HowFar is new and not perfect. There may be bugs. If you find one, you can either:
- Create an issue on the [HowFar Github repo](https://github.com/robbinsa530/HowFar/issues) if you have a Github account, or
- Send an email to alex.robbins530@gmail.com

## Can I donate to HowFar?
You sure can (though you shouldn't feel obligated)! HowFar is not free to host or maintain, but it is a labor of love. That said, if you would like to donate, you can do so through the "Donate" button at the button of the menu. Or by following [this link](https://www.paypal.me/AlexRobbins662).
