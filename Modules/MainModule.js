var app = angular.module("chat-app",["ui.router","ngCookies","ngFileUpload","moment-picker"]);

app.config(function($stateProvider){
	$stateProvider.state("login",{
		url: "/login",
		templateUrl: "../views/login.ejs",
		controller: "LoginController"
	})
	              .state("register",{
	    url: "/register",
	    templateUrl: "../views/register.ejs",
	    controller: "RegisterController"
	})
	              .state("dashboard",{
        url: "/dashboard",
        controller: "DashboardController",
        templateUrl: "../views/dashboard.ejs"
	})
	              .state("logout",{
        url: "/logout",
        controller: "LogoutController",
        templateUrl: "../views/login.ejs"
	})
	              .state("profile",{
        url: "/profile",
        controller: "ProfileController",
        templateUrl: "../views/profile.ejs"
	});
});