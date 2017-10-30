serve Mbtiles using .mbtiles files stored in AWS-S3 via EC2 and cache them in EC2 and serve them
===============================================================================================
## Minimum required Changes / Requirements  
  'AWS accessKeyId & secretAccessKey required tojstart the server'
  
  'Configure LRU options'
  
  'Modify Path for cache in EC2'
  
  'Modify Path to S3  i.e., path till Levels in S3'
  
  'Modify S3 bucket name'

## Setup
  'git clone https://github.com/hostasite/serveMbtiles.git'
  
  'npm install'

## Command to start the server
  'node server.js [AWS accessKeyId] [AWS secretAccessKey]'
