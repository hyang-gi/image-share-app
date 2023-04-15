### Functionality Provided

#### Register

* User can register an account 
* User will be informed on usage of existing email/username to create an account
* Password needs to be at least 8 characters
* Default bio is provided if the user doesn't enter one

#### Login

* User can login 
* User will be informed on usage of non-existent credentials to login
* User can explore the posts section without logging in. 

#### Unauthenticated View

* User can see lists of posts on the home page
* Login button in the header
* On trying to access the post, user is redirected to the login page

#### Authenticated View

* User has access to all the pages
* Header is replaced with home, logged in user's profile, all users and their profiles, and logout button
* User can also upload an image, like a post, comment on a post

#### Upload

* User can upload an image
* User can provide caption and alt-text. Neither is a mandatory field.
* On failure to upload right image, user sees an error message

#### Posts

* Posts can be viewed without being logged in
* User can view posts list from home page and user's profile page
* User can view a single post by clicking on the post
* Metadata about the post is available in form of likes number, comments, who uploaded the post and the caption

#### Comments

* User can make a comment on a post
* User cannot post an empty comment - on doing so, an error message is displayed


#### Likes

#### Message Display

* On invalid authentication
* When no posts are visible
* When no accounts exist
* When there are server issues
* When user tries to access non-existent pages

