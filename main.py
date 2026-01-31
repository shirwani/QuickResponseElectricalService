from flask import Flask, render_template, request, url_for

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/recent-work")
def recent_work():
    return render_template("recent_work.html")


@app.route("/faq")
def faq():
    return render_template("faq.html")


@app.route("/services/electrical-wiring-installation")
def electrical_wiring_installation():
    return render_template("electrical-wiring-installation.html")


@app.route("/services/emergency-electrical-repair")
def emergency_electrical_repair():
    return render_template("emergency-electrical-repair-services.html")


@app.route("/services/electrical-maintenance")
def electrical_maintenance():
    return render_template("electrical-maintenance-services.html")


@app.route("/24-7-electrical-service")
def electrical_service_24_7():
    return render_template("24-7-electrical-service.html")


if __name__ == '__main__':
    app.run(debug=True, port=6001)
