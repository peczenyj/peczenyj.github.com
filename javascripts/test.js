(function(){
  console.log("load test script");
  var location = document.location;
  localStorage.setItem("foo","bar");
  localStorage.setItem("location",  JSON.stringify(location));
  console.log("localstorage[xxx]:", localStorage.getItem("xxx"));
}())
