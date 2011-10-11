from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.api import memcache
from django.utils import simplejson


class LevelHandler(webapp.RequestHandler):
    '''Handler for rendering any pages'''
    
    def get(self):
        self.response.out.write("Hello world")

    
application = webapp.WSGIApplication([('/.*', LevelHandler)], debug=True)


def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
