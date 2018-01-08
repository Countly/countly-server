var plugin = {};
const fs = require('fs');

(function (plugin) {
	plugin.init = function(app, countlyDb){
        app.get(countlyConfig.path+'/data-migration/download', function (req, res, next) {
            if(req.session && req.session.gadm)
            {
                if(req.query && req.query.id)//asked by query id
                {
                    countlyDb.collection("data_migrations").findOne({_id:req.query.id},function(err, data){
                        if(err){}
                        else 
                        {
                            var myfile = path.resolve(__dirname ,'./../export/'+req.query.id+'.tar.gz');
                            if(data.export_path && data.export_path!='')
                            {
                                myfile = data.export_path;
                            }
                            if (fs.existsSync(myfile))
                            {
                                res.set('Content-Type', 'application/x-gzip');
                                res.download(myfile, req.query.id+'.tar.gz');
                                return;
                            }
                        
                        }
                    });
            
                    
                }
                if(req.query && req.query.logfile)
                {
                    if (fs.existsSync(path.resolve(__dirname ,'../../../log/'+req.query.logfile)))
                    {
                        res.set('Content-Type', 'text/plain');
                        res.download(path.resolve(__dirname ,'../../../log/'+req.query.logfile), req.query.logfile);
                        return;
                    }
                    
                }
            }          
        });
	};
}(plugin));

module.exports = plugin;