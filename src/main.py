from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.api import memcache
from django.utils import simplejson
from models import Level, User, Submission
from dict2xml import dict2xml

class LevelHandler(webapp.RequestHandler):

    def get(self):
        level = memcache.get('level')
        if level is None:
            level = Level.all().get()
            memcache.set('level', level)
        
        if level is not None:
            format = self.request.get('format', 'json').lower()
            
            if format == "json":
                self.response.out.write(level.to_json())
            elif format == "xml":
                self.response.out.write(level.to_xml())

class ScoreHandler(webapp.RequestHandler):
    
    def get_user_stats(self, user, format):
        
        played = 0
        submissions = user.submission_set
        if submissions is not None:
            played = submissions.count()
        
        res = {"response": {"user" : user.name, "played" : played}}
        
        if format == "json":
            res = simplejson.dumps(res)
        
        elif format == "xml":
            res = dict2xml(res).to_string()
            
        return res
            
    def get(self):
        user = self.request.get('user', None)
        if user is not None:
            user = User.all().filter("name =", user).get()
            
            if user is not None:
                format = self.request.get('format', 'json').lower()
                res = self.get_user_stats(user, format)
                self.response.out.write(res)
                
                        
    
application = webapp.WSGIApplication([('/level', LevelHandler),
                                      ('/score', ScoreHandler)], debug=True)


def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
