from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.api import memcache
from models import Level

class LevelHandler(webapp.RequestHandler):

    def get(self):
        level = memcache.get('level')
        if level is None:
            level = Level.all().get()
        
        if level is not None:
            suffix = self.request.path.split(".")[1]
            suffix = suffix.lower()
    
            if suffix == "json":
                self.response.out.write(level.to_json())
            elif suffix == "xml":
                self.response.out.write(level.to_xml())
        
    
application = webapp.WSGIApplication([('/level.*', LevelHandler)], debug=True)


def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
