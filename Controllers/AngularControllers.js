var socket = io('http://localhost:5000');

app.controller('LoginController',function($scope,$location,$rootScope,$http,AuthorizationService,$cookies){
	if($cookies.get('token')!=null) $rootScope.userloggedin=true;
	$scope.login = function(user){
		$http({
			url: 'http://localhost:5000/loginapi',
			method: 'POST',
			data: $.param({
				data: JSON.stringify({
					email: user.email,
				    pass: user.pass
				    })
			}),
		    headers : {
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'
             }
		}).then(function(httpres){
			if(httpres.data.data == 'yes'){
				$rootScope.email = httpres.data.info.email;
				$rootScope.userloggedin = true;
				console.log('Correct Credentials');
				window.localStorage.setItem(AuthorizationService.getToken(),httpres.data.Authorization);
				$cookies.put('token',httpres.data.Authorization);
				$cookies.put('email',httpres.data.info.email);
				$cookies.put('name',httpres.data.info.name);
				$cookies.put('dob',httpres.data.info.dob);
				$cookies.put('city',httpres.data.info.city);
				$cookies.put('address',httpres.data.info.address);
				AuthorizationService.setisAuthenticated(true);
				AuthorizationService.setauthToken(httpres.data.Authorization);
				$http.defaults.headers.common.Authorization = AuthorizationService.getauthToken();
				$location.path('/dashboard');
             }
            else
			{
				console.log('Wrong Credentials');
				$scope.message = "Wrong Credentials! Please Try Again";
			}
		})
	}
});
app.controller('RegisterController',function($scope,$rootScope,$cookies,$location,$rootScope,$http){
	if($cookies.get('token')!=null) $rootScope.userloggedin=true;
	$scope.register = function(user){
		$http({
			url: 'http://localhost:5000/registerapi',
			method: 'POST',
			data: $.param({
				data: JSON.stringify({
					name: user.name,
					email: user.email,
				    pass: user.pass
				})
			}),
		    headers : {
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'
             }
		}).then(function(httpres){
			if(JSON.parse(httpres.data) == 'yes')
				console.log('User already exists');
			else
			{
				console.log('User Inserted Successfully');
		        $location.path('/login');
			}
		})
    }
});

app.controller('DashboardController',function($http,$scope,$rootScope,$location,AuthorizationService,$cookies){
	var token = window.localStorage.getItem(AuthorizationService.getToken());
	var cookie = $cookies.get('token');
	if(token != null && cookie !=null){
		if($rootScope.email == undefined || $rootScope.email == null) $rootScope.email = $cookies.get('email');
		$rootScope.userloggedin = true;
		AuthorizationService.setisAuthenticated(true);
		AuthorizationService.setauthToken($cookies.get('authtoken'));
		$scope.userclicked=true;
		//$scope.message = "Welcome "+$rootScope.email;
		$scope.username = $cookies.get('name');
		$scope.email = $cookies.get('email');

		$scope.message_ = '';
		$scope.messages=[];
		$scope.msg_=[];
		socket.on('msgs',function(data){
				$scope.$apply(function(){
		             $scope.messages.push({message: data.message,name: data.email});
		             console.log('msg recieved');
			     });        
		});
		$scope.userisclicked = function(name_){
			$scope.messages=[];
			$scope.userclicked = false;
			$scope.touser = name_;
			$http({
            url: 'http://localhost:5000/getconvid',
			method: 'POST',
			data: $.param({
				data: JSON.stringify({
					user_from: $scope.email,
					user_to: $scope.touser
				})
			}),
		    headers : {
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'
             }
			}).then(function(httpres){
				var data = JSON.parse(httpres.data);
			    $scope.convid = data._id;
			    $scope.sendid($scope.convid);
			    socket.emit('subscribe',$scope.convid,name_);
		})
			
		};
		$scope.sendid = function(id){
			$http({
				url: 'http://localhost:5000/getconvo',
			    method: 'POST',
			    data: $.param({
				data: JSON.stringify({
					convid: id
				})
			}),
		    headers : {
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'
             }
			})
			.then(function(httpres){
				var data = JSON.parse(httpres.data);
				data.forEach(function(msg){
					$scope.messages.push({message: msg.msg,name: msg.user_from});
				});
			})
		};

		$scope.send = function(email,message_){
			/*socket.emit('chat',{
				message: message_,
				email: email
			});*/
			socket.emit('chat',{
				room: $scope.convid,
				message: message_,
				name: $scope.username,
				user_from: $scope.email,
				user_to: $scope.touser,
				convid: $scope.convid
			});
			
		};


		$http({
			url: 'http://localhost:5000/listusers',
			method: 'POST',
			data: $.param({
				data: JSON.stringify({
					email: $cookies.get('email')
				})
			}),
		    headers : {
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'
             }
		})
		.then(function(httpres){
			var data = JSON.parse(httpres.data);
			$scope.names = data;
		})

	}
	else{
		$scope.errormsg = "You must be logged in!!!"
	}
});

app.controller('ProfileController',function(Upload,$scope,$rootScope,$location,AuthorizationService,$cookies,$http){
	var token = window.localStorage.getItem(AuthorizationService.getToken());
	var cookie = $cookies.get('token');
	if(token != null && cookie !=null){
		if($rootScope.email == undefined || $rootScope.email == null) $rootScope.email = $cookies.get('email');
		$rootScope.userloggedin = true;
		AuthorizationService.setisAuthenticated(true);
		AuthorizationService.setauthToken($cookies.get('authtoken'));
		/*$http({
			url: 'http://localhost:5000/getprofile',
			method: 'POST',
			data: $.param({
				data: JSON.stringify({
					email: $cookies.get('email')
				})
			}),
		    headers : {
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'
             }
		})
		.then(function(httpres){
			var data = JSON.parse(httpres.data);
			$cookies.put('name',data.name);
			$cookies.put('email',data.email);
			$cookies.put('address',data.address);
			$cookies.put('dob',data.dob);
			$cookies.put('city',data.city);
		})*/
		$scope.name=$cookies.get('name');
		$scope.email=$cookies.get('email');
		$scope.address=$cookies.get('address');
		$scope.city=$cookies.get('city');
		$scope.dob=$cookies.get('dob');
		$scope.user = {
			name: $scope.name,
			email: $scope.email,
			address: $scope.address,
			dob: $scope.dob,
			city: $scope.city
		};
		//console.log($scope.user.name);
		$scope.submitform = function(){
			var formData = new FormData();
            formData.append('avatar', $scope.avatar);
            formData.append('email',$cookies.get('email'));
			$http({
				url: 'http://localhost:5000/picupload',
			    method: 'POST',
			    headers: {
                'Content-Type': undefined
                },
			    data: formData,
			    transformRequest: angular.identity
			}).then(function(resp){
				$location.path('/dashboard');
			})
		}
		$scope.update = function(user){		
			$http({
				url: 'http://localhost:5000/updateapi',
			    method: 'POST',
			    data: $.param({
				         data: JSON.stringify({
					             name: user.name,
				                 email: user.email,
				                 address: user.address,
				                 dob: user.dob.toLocaleString(),
				                 city: user.city
				                })
			}),
		    headers : {
                         'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'
                      }
			})
			.then(function(httpres){
				console.log('User Updated Successfully');
				var data = JSON.parse(httpres.data);
			     $cookies.put('name',data.name);
		         $cookies.put('email',data.email);
		         $cookies.put('address',data.address);
		         $cookies.put('city',data.city);
		         $cookies.put('dob',data.dob);
		         $location.path('/dashboard');
			})
		}
	}
	else{
		$scope.errormsg = "You must be logged in!!!"
	}
});

app.controller('LogoutController',function($scope,$rootScope,$location,$http,AuthorizationService,$cookies){
	window.localStorage.removeItem(AuthorizationService.getToken());
	$cookies.remove('token');
	AuthorizationService.setauthToken(undefined);
	AuthorizationService.setisAuthenticated(false);
	$http.defaults.headers.common.Authorization = undefined;
	$rootScope.user = null;
	$rootScope.userloggedin = false;
	$location.path('/login');
});

app.factory('AuthorizationService',function(){
	var LOCAL_TOKEN = 'sometext';
	var isAuthenticated = false;
	var authToken;

	return{
		getToken: function(){ return LOCAL_TOKEN; },
		setToken: function(comingtoken){ LOCAL_TOKEN = comingtoken; },
		getisAuthenticated: function(){ return isAuthenticated; },
		setisAuthenticated: function(value){ isAuthenticated = value; },
		getauthToken: function(){ return authToken; },
		setauthToken: function(comingtoken){ authToken = comingtoken; }
	};
});
