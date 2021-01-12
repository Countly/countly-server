var conn;
try
{
    conn = new Mongo("localhost:27017");
}
catch(Error)
{
    //print(Error);
}
print("Waiting for MongoDB connection");
while(conn===undefined)
{
    try
    {
        conn = new Mongo("localhost:27017");
    }
    catch(Error)
    {
        //print(Error);
    }
    sleep(100);
}
var db = conn.getDB("test");
var result = db.runCommand('buildInfo');
print(result.version);