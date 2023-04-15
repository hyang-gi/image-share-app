## Image Sharing Application

The above linked application has been developed for the second semester final assignment for Programming for Digital Media module.

Below is a detailed description of the assignment criteria and the process followed.

### [Application Functionality](https://github.com/hyang-gi/image-share-app/blob/main/functionality.md)

### Assignment Brief

The application must comprise the following features:

* It will allow users to register for an account
* It will allow users to log in to their account and will keep them logged in (using sessions)
* It will allow logged-in users to upload images
* It will allow logged-in users to post comments and likes to images
* It will allow all users (logged-in and not logged-in) to browse all images that have been uploaded
* It will allow all users to view a particular image and to see the date that the image was uploaded, the name of the user who uploaded it, how many likes it has received and any comments that have been posted about that image

### Functionality Expectations

* Make sure you have the correct tables, entity tables and management tables, how many do you need?
* When a visitor signs up for the first time, allow them to register to your application. Make them provide their username and password or let them sign up using their google, facebook, linkedin or other oAuth credentials if you can.
* Once they are registered, let them login to your application. Once logged in, store their name and id into a the session.
* Accept images, define which file extentions are acceptable .jpg, .png, any others?
* Store uploaded images in a dedicated uploads folder in your static content directory.
* When you are taking comments and likes for uploaded images, make sure that you sanitise the user-generated content and validate the values on the server.
* When you handle database interactions, please do so by using models and ideally by using a query builder.
* From a UI/UX perspective, take my comments from the very first lesson in mind:  Visibility, Feedback, Affordance, Mapping, Constraints & Consistency


### Development Process

* Set up the databases using MySql
* Create static pages 
* Add routes for the required pages
* Login and Password authorisation checks
* Adding routes with database connected 
* Uploading pictures functionality - extensions and file size checks included
* Functionality to view all users
* Functionality to view each user and their post, respectively
* Static page support for likes/comments for design 
* Added routes/support to view a single post 
* Comments functionality 
* Optimisation of the nested queries (received help from @bennorth on database optimisation and alternate option for nested queries)
* Likes functionality
