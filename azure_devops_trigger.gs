/**
 * @OnlyCurrentDoc
 *
 */

function onFormSubmit(e) {
  var Environment = e.values[1];
  var rgList = e.values[3];
  var vmList = e.values[4];
  var email = e.values[5];
  
  //Logger.log('type of rgList: ' + typeof rgList);
  //Logger.log('type of vmList: ' + typeof vmList);
  
  if(!rgList){
    rgList = 'none';
    Logger.log('rgList set to none');
  }
  
  if(!vmList){
    vmList = 'none';
    Logger.log('vmList set to none');
  }
  
 
  
  azureDevopsPipeline(Environment, rgList, vmList, email)
}

function azureDevopsPipeline (Environment, rgList, vmList, email) {
  
  var Username = '';
  var PAT = 'airtfgr5fhv6mkehfojndhdyiqt7i7yufi26altkhynz3k2b3owa';
  var Base_Url = 'https://vsrm.dev.azure.com/pwc-gx-advisory/pwc-labs/';
  var Release_name = 'devops-start-stop-vm-adhoc-with-email'
  var Release_Definition_Id = '293';
  var DefinitionEnvironmentId = '';
  var AuthHeader = 'Basic ' + Utilities.base64Encode(Username + ':' + PAT);
  var Options = {
   'headers': {Authorization: AuthHeader}
  }
  // Include 'options' object in every request
  
/*
Find and valiate pipeline item (Release Definition)
*/
  
  try {
  var response = UrlFetchApp.fetch(Base_Url + '_apis/release/definitions/' + Release_Definition_Id + '?api-version=5.1', Options);
  }
  catch(err) {
    Logger.log(err)
    return false;
    }
  
  //Logger.log(response)  
  Logger.log('Start [Validate Stage]...');
  Logger.log('Environment Name: ' + Environment);
  var json = response.getContentText();
  var responseObject = JSON.parse(json);
  try {
    if (responseObject.hasOwnProperty('environments')) { 
      try{
        responseObject.environments.some(function(ele) {
          if(ele['name'] === Environment) {
            Logger.log('Environment: ' + Environment + ' exists')
            DefinitionEnvironmentId = ele['id'];
          }
        });
      }    
      catch(err) {
        Logger.log(Environment + err);
        return false;
      }
      
      Logger.log('DefinitionEnvironmentId: ' + DefinitionEnvironmentId);
    }
    else {
      throw " not found!!"
    }
  }
  catch(err) {
    Logger.log(Environment + err)
    return false;
  }
  
/*
Use Polyfill to add object.assign functionality
*/
  
  if (typeof Object.assign !== 'function') {
  // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target === null || target === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource !== null && nextSource !== undefined) { 
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
  
  }
/*
Create a release for given stage and parameters
*/
  
 Logger.log('Start [Create New Release]...');
 Logger.log('Release Definition Id: ' + Release_Definition_Id);
 Logger.log('Definition Environment Id: ' + DefinitionEnvironmentId);
  try {
    var Bodytemplate = {
      'definitionId' : Release_Definition_Id,
      'isDraft' : 'false',
      'reason' : 'none'
    };
    Object.assign(Bodytemplate, {'artifacts': []});
    Object.assign(Bodytemplate, {'variables': {}});
    Object.assign(Bodytemplate.variables, {'EXCLUDE_VM_NAMES': { value : 'none' }});
    Object.assign(Bodytemplate.variables, {'RESOURCE_GROUP_NAMES': { value : rgList }});
    Object.assign(Bodytemplate.variables, {'VM_ACTION': { value : 'start' }});
    Object.assign(Bodytemplate.variables, {'VM_NAMES': { value : vmList }});
    Object.assign(Bodytemplate.variables, {'DEST_EMAIL_ID': { value : email }});
    var payloaddata = JSON.stringify(Bodytemplate);
    var Options = {
       'headers': {Authorization: AuthHeader},
       'method': 'post',
       'contentType': 'application/json',
       'payload': payloaddata
    };
    var release = UrlFetchApp.fetch(Base_Url + '_apis/release/releases?api-version=5.1', Options);
    var releasejson = release.getContentText();
    var releaseObject = JSON.parse(releasejson);
    var ReleaseId = releaseObject.id;
    Logger.log('ReleaseId: ' + ReleaseId);
    var Variables = releaseObject.variables;
    var ReleaseEnvironmentId = '';
    releaseObject.environments.some(function(nm) {
          if(nm['name'] === Environment) {
            ReleaseEnvironmentId = nm['id'];
            Logger.log('ReleaseEnvironmentId: ' + nm['id'])
          }
        });
    Logger.log('End create new release');
  }
  catch(err) {
    Logger.log(err);
    return false;
  }
/*
Deploy a release for given stage and parameters
*/
  Logger.log('Start [Deploy Release]...');
  Logger.log('Release Id: ' + ReleaseId);
  Logger.log('Release Environment Id: ' + ReleaseEnvironmentId);
  try{
    var Bodytemplate = {
      'comment' : null,
      'scheduledDeploymentTime' : null,
      'status' : 'inProgress'      
    };
    Object.assign(Bodytemplate, {'variables': []});
    var payload = JSON.stringify(Bodytemplate);
    var Options = {
      'headers': {Authorization: AuthHeader},
      'method': 'patch',
      'contentType': 'application/json',
      'payload': payload
    };
    var deploy = UrlFetchApp.fetch(Base_Url + '_apis/release/releases/' + ReleaseId + '/environments/' + ReleaseEnvironmentId + '?api-version=5.1-preview.2', Options);
    var json = deploy.getContentText();
    var deployObject = JSON.parse(json);
    var Releasename = deployObject.release.name;
    Logger.log('Release Name: ' + Releasename);
    Logger.log('End deploy release!');
  }
  catch(err) {
    Logger.log(err);
    return false;
  }
}
